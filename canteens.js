// Everything that is specific to one canteen: the embed title, the menu
// categories to show (in this order), and any cleanup of the raw scraped data.
// Courses that are not listed in "categories" are scraped but never displayed.

export const CANTEENS = {
    "52": {
        title: "Menu Restaurant",
        categories: ["Menu du jour", "Non-végétarien", "Féculents", "Légumes", "Végétarien", "Végan", "Grillade", "Pizza", "Dessert"],
        transform: (menu) => {
            const vegan = menu["Végan"] || [];
            const vege = menu["Végétarien"] || [];
            let nonVege = menu["Non-végétarien"] || [];

            nonVege = nonVege.filter(item => !vegan.includes(item) && !vege.includes(item));
            menu["Végétarien"] = vege.filter(item => !vegan.includes(item) && !/pizza\s*margherit/i.test(item));

            ["Grillade", "Pizza"].forEach(category => {
                const keyword = category === "Grillade" ? "grill" : "pizza";
                const matches = nonVege.filter(item => item.toLowerCase().includes(keyword));

                if (matches.length === 1) {
                    menu[category] = matches;
                    nonVege = nonVege.filter(item => item !== matches[0]);
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
        }
    },
    "53": {
        title: "Menu Cafétéria",
        categories: ["Snack à emporter"],
        transform: (menu) => menu
    }
};
