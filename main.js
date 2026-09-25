import { Client, EmbedBuilder, Events, AttachmentBuilder, GatewayIntentBits } from "discord.js";
import * as cheerio from "cheerio";
import cron from "node-cron";
import { CANTEENS } from "./canteens.js";

// ⚙️ SETTINGS — everything you might need to change before deploying.
const GUILD_ID = "YOUR_GUILD_ID";         // your server's ID; /menu is registered inside this server only
const DAILY_POST_CHANNEL_ID = "1503697548441948263";
const DAILY_POST_SCHEDULE = "30 7 * * *"; // every day at 07:30
const TIMEZONE = "Europe/Luxembourg";
const MENU_URL = "https://ssl.education.lu/eRestauration/CustomerServices/Menu";
const EMBED_COLOR = 0x00AE86;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Fetches one canteen's menu from the portal and returns it as
// { courseName: [dish, ...] } — or null if the page can't be read or the
// canteen is closed today.
async function fetchMenu(restaurantId) {
    const config = CANTEENS[restaurantId];
    if (!config) return null;

    const response = await fetch(MENU_URL, {
        headers: { "cookie": `CustomerServices.Restopolis.SelectedRestaurant=${restaurantId};` },
        signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;

    const $ = cheerio.load(await response.text());

    const dayContainers = $("div.formulaeContainer, div.closed");
    if (dayContainers.length !== 7) return null;

    // Containers are Monday-first; convert JS's Sunday-first getDay() into an index.
    const todayContainer = $(dayContainers[(new Date().getDay() + 6) % 7]);

    const menuData = {};
    let currentCourse = config.categories[0];

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

    return config.transform(menuData);
}

// Builds the message payload — one embed per canteen — or null when no
// canteen has anything on the menu today.
async function buildMenuMessage() {
    const embeds = [];
    const files = [];

    for (const [restaurantId, config] of Object.entries(CANTEENS)) {
        const menuData = await fetchMenu(restaurantId);
        if (!menuData) continue;

        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setColor(EMBED_COLOR)
            .setTimestamp();

        for (const category of config.categories) {
            const items = menuData[category];
            if (items && items.length > 0) {
                embed.addFields({ name: category, value: items.join("\n"), inline: false });
            }
        }

        if (!embed.data.fields || embed.data.fields.length === 0) continue;

        // Easter egg: if quinoa is on the shown menu, attach the quinoa GIF.
        const shownItems = config.categories.flatMap(category => menuData[category] || []);
        if (shownItems.some(item => item.toLowerCase().includes("quinoa"))) {
            embed.setImage("attachment://quinoa.gif");
            if (!files.some(file => file.name === "quinoa.gif")) {
                files.push(new AttachmentBuilder("./quinoa.gif", { name: "quinoa.gif" }));
            }
        }

        embeds.push(embed);
    }

    return embeds.length > 0 ? { embeds, files } : null;
}

async function postDailyMenu() {
    try {
        const channel = await client.channels.fetch(DAILY_POST_CHANNEL_ID);
        const payload = await buildMenuMessage();
        if (payload) await channel.send(payload);
    } catch (error) {
        console.error("Daily menu post failed", error);
    }
}

client.once(Events.ClientReady, async () => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        await guild.commands.set([{ name: "menu", description: "Get today's menu" }]);

        // Drop the old globally registered command so /menu only exists in this server.
        await client.application.commands.set([]);
    } catch (error) {
        console.error("Could not register the /menu command — is GUILD_ID set correctly?", error);
    }

    cron.schedule(DAILY_POST_SCHEDULE, postDailyMenu, { scheduled: true, timezone: TIMEZONE });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "menu") return;

    try {
        await interaction.deferReply();
        const payload = await buildMenuMessage();

        if (payload) {
            await interaction.editReply({ content: "", ...payload });
        } else {
            await interaction.editReply({ content: "Failed to retrieve today's menu." });
        }
    } catch (error) {
        console.error("/menu failed", error);
        await interaction.editReply({ content: "Failed to retrieve today's menu." }).catch(() => {});
    }
});

client.login(process.env.DISCORD_API_KEY);
