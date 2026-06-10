import { Client, GatewayIntentBits, EmbedBuilder, Events } from "discord.js";
import * as cheerio from "cheerio";
import cron from "node-cron";

const SUBSCRIBED_CHANNEL_ID = "1503697548441948263";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

async function getMenu() {
    const html = await fetch("https://ssl.education.lu/eRestauration/CustomerServices/Menu", {
        "headers": {
            "cookie": "CustomerServices.Restopolis.SelectedRestaurant=52;"
        }
    }).then(r => r.text());

    const $ = cheerio.load(html);
    const dayContainers = $("div.formulaeContainer, div.closed");

    if (dayContainers.length !== 7) {
        console.error(`Found ${dayContainers.length} days instead of 7`);
        return null;
    }

    const todayContainer = $(dayContainers[(new Date().getDay() + 6) % 7]);

    const menuData = {};

    let currentCourse = null;
    todayContainer.children().each((_, el) => {
        if ($(el).hasClass("course-name")) {
            currentCourse = $(el).text().trim();
            menuData[currentCourse] = [];
        } else if ($(el).hasClass("product-name") && currentCourse) {
            menuData[currentCourse].push($(el).text().trim());
        }
    });

    menuData["Non-végétarien"] = menuData["Non-végétarien"].filter(
        item => !menuData["Végan"].includes(item) && !menuData["Végétarien"].includes(item)
    );

    menuData["Végétarien"] = menuData["Végétarien"].filter(
        item => !menuData["Végan"].includes(item) && !/pizza\s*margherit/.test(item.toLowerCase())
    );

    menuData["Grillade"] = [];
    if (menuData["Non-végétarien"].filter(e => e.toLowerCase().includes("grill")).length === 1) {
        for (let i = menuData["Non-végétarien"].length - 1; i >= 0; i--) {
            const item = menuData["Non-végétarien"][i];
            if (item.toLowerCase().includes("grill")) {
                menuData["Grillade"].push(menuData["Non-végétarien"].splice(i, 1)[0]);
            }
        }
    }

    menuData["Pizza"] = [];
    if (menuData["Non-végétarien"].filter(e => e.toLowerCase().includes("pizza")).length === 1) {
        for (let i = menuData["Non-végétarien"].length - 1; i >= 0; i--) {
            const item = menuData["Non-végétarien"][i];
            if (item.toLowerCase().includes("pizza")) {
                menuData["Pizza"].push(menuData["Non-végétarien"].splice(i, 1)[0]);
            }
        }
    }

    if (menuData["Non-végétarien"].length === 1 && menuData["Féculents"].length === 1 && menuData["Légumes"] && menuData["Légumes"].length === 1) {
        menuData["Menu du jour"] = [
            `${menuData["Non-végétarien"][0]} avec ${menuData["Féculents"][0].toLowerCase()} et ${menuData["Légumes"][0].toLowerCase()}`
        ];
        delete menuData["Non-végétarien"];
        delete menuData["Féculents"];
        delete menuData["Légumes"];
    }

    const embed = new EmbedBuilder()
        .setTitle("🍴 Today's Menu")
        .setColor(0x00AE86)
        .setTimestamp();

    const MenuTypes = {
        "Menu du jour": "🍔 Menu du jour",
        "Non-végétarien": "🍖 Non-végétarien",
        "Féculents": "🥔 Féculents",
        "Légumes": "🥦 Légumes",
        "Végétarien": "🥗 Végétarien",
        "Végan": "🌱 Végan",
        "Grillade": "🔥 Grillade",
        "Pizza": "🍕 Pizza",
        "Dessert": "🍰 Dessert"
    };

    for (const [type, title] of Object.entries(MenuTypes)) {
        if (menuData[type] && menuData[type].length > 0) {
            embed.addFields({ name: title, value: menuData[type].join("\n"), inline: false });
        }
    }

    if (embed.data.fields && embed.data.fields.length === 0) {
        console.error("No menu items found");
        return null;
    }

    embed.setImage("https://larecette.net/wp-content/uploads/2026/01/fBo8OpImWH-1768310951-1200x900.jpeg");

    return embed;

}

client.once(Events.ClientReady, async () => {
    const commands = [
        {
            name: "menu",
            description: "Get today's menu",
        }
    ];

    try {
        await client.application.commands.set(commands);
    } catch (error) {
        console.error("Failed to register commands:", error);
    }

    cron.schedule("30 7 * * *", async () => {
        try {
            const channel = await client.channels.fetch(SUBSCRIBED_CHANNEL_ID);

            const responseEmbed = await getMenu();
            if (responseEmbed) {
                await channel.send({ embeds: [responseEmbed] });
            } else {
                console.error("Failed to fetch menu for scheduled broadcast.");
            }
        } catch (error) {
            console.error("Error during daily menu broadcast:", error);
        }
    }, {
        scheduled: true,
        timezone: "Europe/Luxembourg"
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "menu") {

        await interaction.deferReply();

        const responseEmbed = await getMenu();
        if (responseEmbed == null) {
            console.error("Failed to get menu");
            return;
        }

        try {
            await interaction.editReply({ embeds: [responseEmbed] });
        } catch (error) {
            console.error("Error sending response:", error);
        }
    }
});

client.login(process.env.DISCORD_API_KEY);
