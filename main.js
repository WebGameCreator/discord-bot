import { Client, GatewayIntentBits, EmbedBuilder, Events, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import * as cheerio from "cheerio";
import cron from "node-cron";

const SUBSCRIBED_CHANNEL_ID = "1503697548441948263";
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CANTEENS = {
    "52": {
        label: "Restaurant",
        description: "View the main lunch menu",
        title: "🍴 Menu Restaurant",
        categories: {
            "Menu du jour": "🍔 Menu du jour",
            "Non-végétarien": "🍖 Non-végétarien",
            "Féculents": "🥔 Féculents",
            "Légumes": "🥦 Légumes",
            "Végétarien": "🥗 Végétarien",
            "Végan": "🌱 Végan",
            "Grillade": "🔥 Grillade",
            "Pizza": "🍕 Pizza",
            "Dessert": "🍰 Dessert"
        },
        transform: (menu) => {
            const vegan = menu["Végan"] || [];
            const vege = menu["Végétarien"] || [];
            let nonVege = menu["Non-végétarien"] || [];

            nonVege = nonVege.filter(item => !vegan.includes(item) && !vege.includes(item));
            menu["Végétarien"] = vege.filter(item => !vegan.includes(item) && !/pizza\s*margherit/i.test(item));

            ["Grillade", "Pizza"].forEach(category => {
                const keyword = category === "Grillade" ? "grill" : "pizza";
                const matches = nonVege.filter(e => e.toLowerCase().includes(keyword));

                if (matches.length === 1) {
                    const matchIdx = nonVege.findIndex(e => e.toLowerCase().includes(keyword));
                    menu[category] = [nonVege.splice(matchIdx, 1)[0]];
                }
            });

            menu["Non-végétarien"] = nonVege;

            if (nonVege.length === 1 && menu["Féculents"]?.length === 1 && menu["Légumes"]?.length === 1) {
                menu["Menu du jour"] = [`${nonVege[0]} avec ${menu["Féculents"][0].toLowerCase()} et ${menu["Légumes"][0].toLowerCase()}`];
                delete menu["Non-végétarien"];
                delete menu["Féculents"];
                delete menu["Légumes"];
            }
            return menu;
        },
        getImage: (menuData) => {
            const hasQuinoa = JSON.stringify(menuData).toLowerCase().includes("quinoa");
            return hasQuinoa
                ? { url: "attachment://quinoa.gif", files: [new AttachmentBuilder('./quinoa.gif', { name: 'quinoa.gif' })] }
                : { url: "https://larecette.net/wp-content/uploads/2026/01/fBo8OpImWH-1768310951-1200x900.jpeg", files: [] };
        }
    },
    "53": {
        label: "Cafeteria",
        description: "View grab-and-go snacks",
        title: "🥪 Menu Cafétéria",
        categories: {
            "Snack à emporter": "🥡 Snack à emporter"
        },
        transform: (menu) => menu,
        getImage: () => ({
            url: "https://portal.education.lu/portals/88/Images/BANNERS/restopolis-banners-menu.jpg",
            files: []
        })
    }
};

function getDropdownRow(selectedId = "52") {
    const select = new StringSelectMenuBuilder()
        .setCustomId("select-restaurant")
        .setPlaceholder("Choose a dining option...")
        .addOptions(Object.entries(CANTEENS).map(([id, cfg]) => ({
            label: cfg.label,
            description: cfg.description,
            value: id,
            default: String(selectedId) === id
        })));

    return new ActionRowBuilder().addComponents(select);
}

async function getMenu(restaurantId = "52") {
    const config = CANTEENS[String(restaurantId)];
    if (!config) return null;

    const html = await fetch("https://ssl.education.lu/eRestauration/CustomerServices/Menu", {
        headers: { "cookie": `CustomerServices.Restopolis.SelectedRestaurant=${restaurantId};` }
    }).then(r => r.text());

    const $ = cheerio.load(html);
    const dayContainers = $("div.formulaeContainer, div.closed");
    if (dayContainers.length !== 7) return null;

    const todayContainer = $(dayContainers[(new Date().getDay() + 6) % 7]);

    let menuData = {};
    let currentCourse = Object.keys(config.categories)[0];

    todayContainer.find(".course-name, .product-name").each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        if (!text) return;

        if ($el.hasClass("course-name")) {
            currentCourse = text;
        } else if ($el.hasClass("product-name")) {
            if (!menuData[currentCourse]) menuData[currentCourse] = [];
            menuData[currentCourse].push(text);
        }
    });

    menuData = config.transform(menuData);
    const { url, files } = config.getImage(menuData);

    const embed = new EmbedBuilder()
        .setTitle(config.title)
        .setColor(0x00AE86)
        .setImage(url)
        .setTimestamp();

    for (const [courseKey, displayTitle] of Object.entries(config.categories)) {
        const items = menuData[courseKey];
        if (items && items.length > 0) {
            embed.addFields({ name: displayTitle, value: items.join("\n"), inline: false });
        }
    }

    if (!embed.data.fields || embed.data.fields.length === 0) return null;

    return { embeds: [embed], files };
}

client.once(Events.ClientReady, async () => {
    await client.application.commands.set([{ name: "menu", description: "Get today's menu" }]);

    cron.schedule("30 7 * * *", async () => {
        try {
            const channel = await client.channels.fetch(SUBSCRIBED_CHANNEL_ID);
            const payload = await getMenu("52");
            if (payload) {
                payload.components = [getDropdownRow("52")];
                await channel.send(payload);
            }
        } catch (e) { console.error("Cron job failed", e); }
    }, { scheduled: true, timezone: "Europe/Luxembourg" });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === "menu") {
        await interaction.deferReply();
        const payload = await getMenu("52");

        if (!payload) return interaction.editReply("Failed to retrieve today's menu.");

        payload.components = [getDropdownRow("52")];
        await interaction.editReply(payload);
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "select-restaurant") {
        const targetId = interaction.values[0];
        const payload = await getMenu(targetId);

        if (!payload) {
            return interaction.update({ content: "Menu unavailable for this option.", embeds: [], components: [getDropdownRow(targetId)] });
        }

        payload.components = [getDropdownRow(targetId)];
        await interaction.update(payload);
    }
});

client.login(process.env.DISCORD_API_KEY);
