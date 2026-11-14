// The menu, from The Mountain Flame menu card (21 October version). Prices in PKR.
//
// Each category has a list of items. An item has:
//   id       unique, lowercase, no spaces (used to track the cart)
//   name     shown on the menu
//   desc     one short line (optional)
//   price    for items with a single price
//   options  instead of price, for items sold in sizes: [{ label, price }]
//   tag      small label such as 'Special' (optional)

const halfFull = (half, full) => [{ label: 'Half', price: half }, { label: 'Full', price: full }];

window.MENU = [
  {
    category: 'Lamb',
    items: [
      { id: 'lamb-shinwari-karahi', name: 'Lamb Shinwari Karahi', options: halfFull(3145, 5745) },
      { id: 'lamb-shinwari-karahi-special', name: 'Lamb Shinwari Karahi', tag: 'Special', options: [{ label: 'Full', price: 6145 }] },
      { id: 'lamb-sulemani-karahi', name: 'Lamb Sulemani Karahi', options: halfFull(3145, 5745) },
      { id: 'lamb-sulemani-karahi-special', name: 'Lamb Sulemani Karahi', tag: 'Special', options: [{ label: 'Full', price: 6145 }] },
      { id: 'lamb-shinwari-qeema', name: 'Lamb Shinwari Qeema', options: halfFull(3145, 5745) },
      { id: 'lamb-namkeen-rosh', name: 'Lamb Namkeen Rosh', options: [{ label: 'Full', price: 5745 }] },
      { id: 'lamb-masala-rosh', name: 'Lamb Masala Rosh', options: [{ label: 'Full', price: 5745 }] },
      { id: 'lamb-namkeen-tikka', name: 'Lamb Namkeen Tikka', options: halfFull(3145, 5745) },
    ],
  },
  {
    category: 'Mutton',
    items: [
      { id: 'mutton-shinwari-karahi', name: 'Mutton Shinwari Karahi', options: halfFull(3345, 6145) },
      { id: 'mutton-sulemani-karahi', name: 'Mutton Sulemani Karahi', options: halfFull(3345, 6145) },
      { id: 'mutton-shinwari-qeema', name: 'Mutton Shinwari Qeema', options: halfFull(3345, 6145) },
      { id: 'mutton-namkeen-tikka', name: 'Mutton Namkeen Tikka', options: halfFull(3345, 6145) },
    ],
  },
  {
    category: 'Chicken',
    items: [
      { id: 'chicken-shinwari-karahi', name: 'Chicken Shinwari Karahi', options: halfFull(1545, 2845) },
      { id: 'chicken-seekh-kebab', name: 'Chicken Seekh Kebab', options: [{ label: 'Full', price: 1845 }] },
      { id: 'chicken-tikka-boti', name: 'Chicken Tikka Boti', options: [{ label: 'Full', price: 1845 }] },
      { id: 'chicken-malai-boti', name: 'Chicken Malai Boti', options: [{ label: 'Full', price: 2245 }] },
    ],
  },
  {
    category: 'Beef & Pulao',
    items: [
      { id: 'beef-chappal-kebab', name: 'Beef Chappal Kebab', options: halfFull(1745, 2945) },
      { id: 'beef-seekh-kebab', name: 'Beef Seekh Kebab', options: [{ label: 'Full', price: 2545 }] },
      { id: 'beef-kabli-pulao', name: 'Beef Kabli Pulao', options: [{ label: 'Full', price: 2245 }] },
      { id: 'plain-kabli-pulao', name: 'Plain Kabli Pulao', options: [{ label: 'Full', price: 1145 }] },
    ],
  },
  {
    category: 'Platter',
    items: [
      { id: 'mountain-flame-platter', name: 'The Mountain Flame Platter', tag: 'For sharing',
        desc: 'Chicken Seekh Kebab · Beef Seekh Kebab · Chicken Tikka Boti · Chicken Malai Boti · Beef Chappal Kebab · Plain Kabli Pulao · Mint Raita',
        options: [{ label: '3–4 persons', price: 7945 }, { label: '6–8 persons', price: 13745 }] },
    ],
  },
  {
    category: 'Tandoor',
    items: [
      { id: 'afghani-roti', name: 'Afghani Roti', price: 165 },
      { id: 'afghani-naan', name: 'Afghani Naan', price: 225 },
    ],
  },
  {
    category: 'Sides',
    items: [
      { id: 'mint-raita', name: 'Mint Raita', price: 325 },
      { id: 'zeera-raita', name: 'Zeera Raita', price: 325 },
      { id: 'fresh-salad', name: 'Fresh Salad', price: 325 },
      { id: 'green-sauce', name: 'Green Sauce', price: 125 },
      { id: 'tomato-sauce', name: 'Tomato Sauce', price: 125 },
    ],
  },
  {
    category: 'Drinks',
    items: [
      { id: 'peshawari-qahwa', name: 'Peshawari Qahwa', price: 215 },
      { id: 'fresh-lime', name: 'Fresh Lime', price: 345 },
      { id: 'mint-margarita', name: 'Mint Margarita', price: 545 },
      { id: 'blue-lagoon', name: 'Blue Lagoon', price: 545 },
      { id: 'soft-drink', name: 'Soft Drink', options: [{ label: 'Regular', price: 245 }, { label: 'Zero', price: 265 }] },
      { id: 'water', name: 'Water', options: [{ label: 'Small', price: 145 }, { label: 'Large', price: 245 }] },
    ],
  },
  {
    category: 'Desserts',
    items: [
      { id: 'gulab-jamun', name: 'Gulab Jamun', price: 445 },
      { id: 'toothi', name: 'Toothi', price: 445 },
    ],
  },
];
