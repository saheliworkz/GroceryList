import type { GroceryItem } from "./types.js";

const groups: Record<string, Array<[string, string | null]>> = {
  Rice: [
    ["GobindoBhog", "1 Kg"], ["Everyday Basmati rice", "10 Kg"], ["Basmati rice", "2 Kg"]
  ],
  Dal: [
    ["Masoor", "1 Kg"], ["Moong", "1 Kg"], ["Toor", "250 gm"], ["Urad", "250 gm"],
    ["Chana dal", "500 gm"], ["Matar dal", "250 gm"], ["Arhar dal", "250 gm"], ["Kabuli Chana", "500 gm"]
  ],
  Masala: [
    ["Turmeric Powder", "200 gm"], ["Red Chilli Powder", "200 gm"], ["Red Chilli Whole", "100 gm"],
    ["Cumin Powder", "200 gm"], ["Cumin Whole", "100 gm"], ["Coriander Powder", "100 gm"],
    ["Coriander seed whole", "50 gm"], ["Kala Jeera", "25 gm"], ["Methi seed", "50 gm"],
    ["Panch Phoron", "50 gm"], ["Black Mustard seed", "200 gm"], ["White Mustard seed", "200 gm"],
    ["Bay Leaf", "100 gm"], ["Black Pepper Whole", "100 gm"], ["Black Pepper Powder", "100 gm"],
    ["White Pepper Whole", "100 gm"], ["White Pepper Powder", "100 gm"], ["Radhuni", "25 gm"],
    ["Fennel seed", "50 gm"], ["Kasuri Methi", "100 gm"], ["Garam Masala Powder", "100 gm"],
    ["Green cardamom pods", "25 gm"], ["Cloves", "25 gm"], ["Cinnamon stick", "50 gm"],
    ["Nutmeg", "25 gm"], ["Black cardamom pods", "25 gm"], ["Mace", "25 gm"],
    ["Star Anise", "25 gm"], ["Saffron", null], ["Ajwain", "25 gm"]
  ],
  Others: [
    ["Atta", "5 kg"], ["Maida", "2 kg"], ["Sabudana", "500 gm"], ["Poha Thick", "100 gm"],
    ["Poha Thin", "100 gm"], ["white Salt", "1 kg"], ["Sugar", "2 kg"], ["Tomato Sauce", null],
    ["Green Chilli Sauce", null], ["Soya Sauce", null], ["Vinegar", null], ["Sezwan Sauce", null],
    ["Sweet Chilli Sauce", null], ["Mustard Oil", "3 ltr"], ["Sunflower Oil", "1 ltr"],
    ["Olive Oil", "1 ltr"], ["Rice Bran Oil", "1 ltr"], ["Soyabean Oil", "1 ltr"],
    ["Butter", "200 gm"], ["Ghee", "250 gm"], ["Cheese", null], ["Colgate Total ToothPaste", null],
    ["MouthWash", null], ["Soap", null], ["Suthol", null], ["Shaving foam", null],
    ["Shaving razor men", null], ["Dishwasher Bar", null], ["Dishwasher Gel", null],
    ["Scotch brite steel scrub", null], ["Scotch brite scrub", null], ["Phenyl", null],
    ["Handwash Liquid", null], ["Harpic toilet cleaner", null]
  ]
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const groceries: GroceryItem[] = Object.entries(groups).flatMap(([category, items]) =>
  items.map(([name, minimumOrder], index) => ({
    id: `${slug(category)}-${index + 1}-${slug(name)}`,
    category,
    name,
    minimumOrder
  }))
);
