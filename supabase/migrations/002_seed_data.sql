-- Seed Product Data (from نظام_المخزون_والطلبيات.xlsx)
-- Categories: Barista/Beverages, Hall/Packaging, Hall/Cleaning, Kitchen/Grocery

-- Helper: insert products with category and supplier lookup
DO $$
DECLARE
  cat_barista UUID;
  cat_packaging UUID;
  cat_cleaning UUID;
  cat_kitchen UUID;

  sup_jet UUID;
  sup_cola UUID;
  sup_splayed UUID;
  sup_jersey UUID;
  sup_om_abuouf UUID;
  sup_om_samy UUID;
  sup_kunur UUID;
  sup_raei UUID;
  sup_qubaisi UUID;
  sup_eye UUID;
  sup_helmar UUID;
  sup_mustafa UUID;
  sup_halwani UUID;
  sup_amkay UUID;
  sup_sharq UUID;
  sup_tamry UUID;
  sup_feegon UUID;
  sup_smiley UUID;
  sup_kingm UUID;
  sup_birdfst UUID;
  sup_chef UUID;
  sup_alamiya UUID;
  sup_moraa UUID;
  sup_johaina UUID;
  sup_prints UUID;
  sup_meats UUID;
  sup_factory UUID;
  sup_attara UUID;
BEGIN
  SELECT id INTO cat_barista FROM categories WHERE name = 'Barista/Beverages';
  SELECT id INTO cat_packaging FROM categories WHERE name = 'Hall/Packaging';
  SELECT id INTO cat_cleaning FROM categories WHERE name = 'Hall/Cleaning';
  SELECT id INTO cat_kitchen FROM categories WHERE name = 'Kitchen/Grocery';

  SELECT id INTO sup_jet FROM suppliers WHERE name = 'Jet';
  SELECT id INTO sup_cola FROM suppliers WHERE name = 'Cola';
  SELECT id INTO sup_splayed FROM suppliers WHERE name = 'Splayed';
  SELECT id INTO sup_jersey FROM suppliers WHERE name = 'Jersey';
  SELECT id INTO sup_om_abuouf FROM suppliers WHERE name = 'Om Mahmoud / Abu Ouf';
  SELECT id INTO sup_om_samy FROM suppliers WHERE name = 'Om Mahmoud / Samy Salama';
  SELECT id INTO sup_kunur FROM suppliers WHERE name = 'Kunur';
  SELECT id INTO sup_raei FROM suppliers WHERE name = 'Al-Raei';
  SELECT id INTO sup_qubaisi FROM suppliers WHERE name = 'Al-Qubaisi';
  SELECT id INTO sup_eye FROM suppliers WHERE name = 'Eye To Me';
  SELECT id INTO sup_helmar FROM suppliers WHERE name = 'Helmar';
  SELECT id INTO sup_mustafa FROM suppliers WHERE name = 'Al-Mustafa';
  SELECT id INTO sup_halwani FROM suppliers WHERE name = 'Halwani';
  SELECT id INTO sup_amkay FROM suppliers WHERE name = 'Amkay';
  SELECT id INTO sup_sharq FROM suppliers WHERE name = 'Al-Sharq';
  SELECT id INTO sup_tamry FROM suppliers WHERE name = 'Tamry';
  SELECT id INTO sup_feegon FROM suppliers WHERE name = 'Feegon';
  SELECT id INTO sup_smiley FROM suppliers WHERE name = 'Smiley';
  SELECT id INTO sup_kingm FROM suppliers WHERE name = 'King M';
  SELECT id INTO sup_birdfst FROM suppliers WHERE name = 'Bird Fast';
  SELECT id INTO sup_chef FROM suppliers WHERE name = 'Chef Ismail';
  SELECT id INTO sup_alamiya FROM suppliers WHERE name = 'Al-Alamiya';
  SELECT id INTO sup_moraa FROM suppliers WHERE name = 'Al-Moraa';
  SELECT id INTO sup_johaina FROM suppliers WHERE name = 'Johaina';
  SELECT id INTO sup_prints FROM suppliers WHERE name = 'Prints';
  SELECT id INTO sup_meats FROM suppliers WHERE name = 'Meats';
  SELECT id INTO sup_factory FROM suppliers WHERE name = 'Factory Prep';

  -- ==================== BARISTA / BEVERAGES ====================
  INSERT INTO products (name, name_ar, category_id, supplier_id, unit, unit_ar, price, reorder_level) VALUES
    ('Espresso', 'اسبرسو', cat_barista, sup_jet, 'bag', 'كيس', 800, 2),
    ('Sprite', 'اسبريت', cat_barista, sup_cola, 'palette', 'بالتة', 328, 1),
    ('Sprite Diet', 'اسبريت دايت', cat_barista, sup_cola, 'palette', 'بالتة', 336, 1),
    ('Passion Syrup', 'الباشون سيرب', cat_barista, sup_jet, 'bottle', 'زجاجة', 185, 2),
    ('Pineapple Juhayna', 'اناناس جهينه', cat_barista, sup_splayed, 'can', 'علبة', 31, 5),
    ('Chocolate Ice Cream 3L', 'ايس كريم شوكليت 3لتر', cat_barista, sup_jersey, 'carton', 'كرتونة', 260, 2),
    ('Vanilla Ice Cream 3L', 'ايس كريم فانيليا 3لتر', cat_barista, sup_jersey, 'carton', 'كرتونة', 260, 2),
    ('Breal Cans', 'بريل كانز', cat_barista, sup_splayed, 'palette', 'بالتة', 340, 1),
    ('Blue Curacao Syrup', 'بلو كرواسو سيرب', cat_barista, sup_jet, 'bottle', 'زجاجة', 171, 2),
    ('Hazelnut Coffee', 'بن بندق', cat_barista, sup_om_abuouf, 'can', 'علبة', 265, 3),
    ('Plain Coffee', 'بن سادة', cat_barista, sup_om_samy, 'kg', 'ك', 520, 2),
    ('Dark Coffee', 'بن غامق', cat_barista, sup_om_abuouf, 'can', 'علبة', 280, 3),
    ('Apple Juhayna', 'تفاح جهينه', cat_barista, sup_splayed, 'can', 'علبة', 30, 5),
    ('Blueberry Topping', 'توبنج بلوبيري', cat_barista, sup_jet, 'bottle', 'زجاجة', 180, 2),
    ('Mix Berry Topping', 'توبينج ميكس بيري', cat_barista, sup_jet, 'bottle', 'زجاجة', 169, 2),
    ('Passion Fruit Topping', 'توبينج باشون فروت', cat_barista, sup_jet, 'bottle', 'زجاجة', 175, 2),
    ('Strawberry Topping', 'توبينج فراوله', cat_barista, sup_jet, 'bottle', 'زجاجة', 176, 2),
    ('Kiwi Topping', 'توبينج كيوي', cat_barista, sup_jet, 'bottle', 'زجاجة', 182, 2),
    ('Ice', 'ثلج', cat_barista, NULL, 'bag', 'كيس', 60, 5),
    ('Water Gallon', 'جالون مياة', cat_barista, sup_cola, 'gallon', 'جالون', 85, 3),
    ('Red Bull', 'ريدبول', cat_barista, sup_raei, 'palette', 'بالتة', 1000, 1),
    ('Sahlab', 'سحلب', cat_barista, NULL, 'kg', 'ك', 200, 2),
    ('Sugar', 'سكر', cat_barista, sup_splayed, 'kg', 'ك', 32, 10),
    ('Blue Curacao Syrup 2', 'سيرب بلو كرواسو', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Coconut Syrup', 'سيرب جوز هند', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Peach Syrup', 'سيرب خوخ', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Vanilla Syrup', 'سيرب فانليا', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Strawberry Syrup', 'سيرب فراوله', cat_barista, sup_jet, 'bottle', 'زجاجة', 0, 2),
    ('Caramel Syrup', 'سيرب كراميل', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Cherry Syrup', 'سيرب كريز', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Kiwi Syrup', 'سيرب كيوى', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Mojito Syrup', 'سيرب موخيتو', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Mint Syrup', 'سيرب نعناع', cat_barista, sup_jet, 'bottle', 'زجاجة', 85, 2),
    ('Tea Bags', 'شاى فتلة', cat_barista, sup_kunur, 'can', 'علبة', 57, 3),
    ('Arousa Tea', 'شاي العروسه', cat_barista, sup_om_samy, 'can', 'علبة', 52, 3),
    ('Pineapple Slices', 'شرايح اناناس', cat_barista, sup_jet, 'can', 'علبة', 120, 3),
    ('Peach Slices', 'شرايح خوخ', cat_barista, sup_jet, 'can', 'علبة', 140, 3),
    ('Schweppes Gold Pineapple', 'شويبس جولد اناناس', cat_barista, sup_cola, 'palette', 'بالتة', 336, 1),
    ('Schweppes Gold Peach', 'شويبس جولد خوخ', cat_barista, sup_cola, 'palette', 'بالتة', 336, 1),
    ('Pineapple Solo Sauce', 'صوص انانااس سولو', cat_barista, sup_jet, 'bottle', 'زجاجة', 170, 2),
    ('Pistachio Sauce', 'صوص بستاشيو', cat_barista, sup_jet, 'can', 'علبة', 660, 1),
    ('Coconut Solo Sauce', 'صوص جوز هند سولو', cat_barista, sup_qubaisi, 'jerkin', 'جركن', 95, 2),
    ('White Honey', 'عسل ابيض', cat_barista, sup_splayed, 'jar', 'برطمان', 187, 2),
    ('Orange Juice', 'عصير برتقال', cat_barista, sup_qubaisi, 'jerkin', 'جركن', 90, 2),
    ('Guava Juice', 'عصير جوافة', cat_barista, sup_qubaisi, 'jerkin', 'جركن', 95, 2),
    ('Mango Juice', 'عصير مانجو', cat_barista, sup_qubaisi, 'jerkin', 'جركن', 105, 2),
    ('Frappe Powder', 'علبه بودره فربيه', cat_barista, sup_jet, 'can', 'علبة', 284, 2),
    ('Cola', 'كولا', cat_barista, sup_cola, 'palette', 'بالتة', 336, 1),
    ('Diet Cola', 'كولا دايت', cat_barista, sup_cola, 'palette', 'بالتة', 336, 1),
    ('Skimmed Milk', 'لبن خالي الدسم', cat_barista, sup_splayed, 'palette', 'بالتة', 535, 1),
    ('Lamar Milk', 'لبن لمار بالته', cat_barista, sup_splayed, 'palette', 'بالتة', 525, 1),
    ('Aniseed', 'ينسون', cat_barista, sup_om_samy, 'can', 'علبة', 70, 3);

  -- ==================== HALL / PACKAGING ====================
  INSERT INTO products (name, name_ar, category_id, supplier_id, unit, unit_ar, price, reorder_level) VALUES
    ('Takeaway Juice Cup 10oz', 'اكواب تيك اواي عصير 10', cat_packaging, sup_eye, 'carton', 'كرتونة', 1050, 2),
    ('Takeaway Juice Cup 14oz', 'اكواب تيك اواي عصير 14', cat_packaging, sup_eye, 'carton', 'كرتونة', 1050, 2),
    ('Takeaway Juice Cup 16oz', 'اكواب تيك اواي عصير 16', cat_packaging, sup_eye, 'carton', 'كرتونة', 1250, 2),
    ('Takeaway Knife', 'تيك اواي سكين', cat_packaging, sup_eye, 'bag', 'كيس', 33, 3),
    ('Takeaway Fork', 'تيك اواي شوكه', cat_packaging, sup_eye, 'bag', 'كيس', 33, 3),
    ('Takeaway Coffee Cup', 'تيك اواي قهوه', cat_packaging, sup_eye, 'carton', 'كرتونة', 65, 2),
    ('Takeaway Cappuccino 12oz', 'تيك اواي كابتشينو 12', cat_packaging, sup_eye, 'carton', 'كرتونة', 1020, 2),
    ('Takeaway Cappuccino 8oz', 'تيك اواي كابتشينو 8', cat_packaging, sup_eye, 'carton', 'كرتونة', 800, 2),
    ('Toothpicks', 'خله اسنان', cat_packaging, sup_eye, 'box', 'علبة', 30, 5),
    ('Captain Order Pad', 'دستة كابتن اوردر', cat_packaging, sup_eye, 'piece', 'عدد', 20, 3),
    ('White Sugar Hall', 'سكر ابيض صالة', cat_packaging, sup_jet, 'bag', 'كيس', 65, 5),
    ('Brown Sugar Hall', 'سكر بني صالة', cat_packaging, sup_jet, 'bag', 'كيس', 60, 5),
    ('Diet Sugar Sachets', 'سكر دايت اظرف', cat_packaging, sup_jet, 'bag', 'كيس', 188, 3),
    ('Small Chalimoh', 'شاليموه صغير', cat_packaging, sup_eye, 'bag', 'كيس', 20, 5),
    ('Large Chalimoh', 'شاليموه كبير', cat_packaging, sup_eye, 'bag', 'كيس', 23, 5),
    ('Green Tea', 'شاي اخضر', cat_packaging, sup_splayed, 'box', 'علبة', 175, 2),
    ('White Plastic Bags', 'شنط بلاستك ابيض', cat_packaging, sup_eye, 'bag', 'كيس', 90, 3),
    ('Plastic Cup Lids', 'غطاء كوبيات بلاستك', cat_packaging, sup_eye, 'carton', 'كرتونة', 450, 2),
    ('Ketchup Palette', 'كاتشب ازايز بالته', cat_packaging, sup_kunur, 'palette', 'بالتة', 30, 2),
    ('Pizza Boxes', 'كراتين بيتزا', cat_packaging, sup_prints, 'palette', 'بالتة', 6, 5),
    ('Plastic Spoons', 'معالق تيك اواي بلاستيك', cat_packaging, sup_eye, 'kg', 'ك', 35, 3),
    ('Wooden Spoons', 'معالق خشب', cat_packaging, sup_eye, 'bag', 'كيس', 160, 2),
    ('Visa Paper', 'ورق فيزا', cat_packaging, sup_eye, 'piece', 'عدد', 16, 10),
    ('Cashier Paper', 'ورق كاشير', cat_packaging, sup_eye, 'piece', 'عدد', 38, 10);

  -- ==================== HALL / CLEANING ====================
  INSERT INTO products (name, name_ar, category_id, supplier_id, unit, unit_ar, price, reorder_level) VALUES
    ('Oxy Cleaner', 'اوكسي', cat_cleaning, sup_eye, 'bag', 'كيس', 540, 2),
    ('Mop Head', 'ايد مقشه', cat_cleaning, sup_eye, 'piece', 'عدد', 25, 2),
    ('Cloth Mop', 'شرشوبه قماش', cat_cleaning, sup_eye, 'piece', 'عدد', 20, 2),
    ('Bathroom Soap', 'صابون حمام', cat_cleaning, sup_eye, 'jerkin', 'جركن', 50, 3),
    ('Medical Alcohol', 'كحول طبى', cat_cleaning, sup_eye, 'jerkin', 'جركن', 120, 2),
    ('Garbage Bags', 'كلفظ كيس', cat_cleaning, sup_eye, 'bag', 'كيس', 10, 5),
    ('Chlorine', 'كلور', cat_cleaning, sup_eye, 'bag', 'كيس', 25, 3),
    ('Large Detergent', 'كيس مسحوق كبيير', cat_cleaning, NULL, 'bag', 'كيس', 500, 1),
    ('Glass Cleaner', 'مساح زجاج', cat_cleaning, sup_eye, 'piece', 'عدد', 30, 2),
    ('Device Freshener', 'معطر جهاز', cat_cleaning, sup_eye, 'bottle', 'زجاجة', 30, 3),
    ('Air Freshener', 'معطر جو', cat_cleaning, sup_eye, 'bottle', 'زجاجة', 48, 3),
    ('Wood Polish', 'ملمع خشب', cat_cleaning, sup_eye, 'bottle', 'زجاجة', 80, 2),
    ('Bathroom Tissues', 'مناديل حمام سحب', cat_cleaning, sup_eye, 'palette', 'بالتة', 265, 2),
    ('Pull Tissues', 'مناديل سحب بكر', cat_cleaning, sup_eye, 'palette', 'بالتة', 290, 2),
    ('Table Napkins 550', 'مناديل سفرة 550', cat_cleaning, sup_eye, 'palette', 'بالتة', 430, 1),
    ('Kitchen Tissues', 'مناديل مطبخ', cat_cleaning, sup_eye, 'palette', 'بالتة', 380, 2),
    ('Scented Floor Cleaner', 'منظف ارضيات معطر', cat_cleaning, sup_eye, 'jerkin', 'جركن', 85, 2),
    ('Hairnet', 'هيرنت', cat_cleaning, sup_eye, 'bag', 'كيس', 40, 5);

  -- ==================== KITCHEN / GROCERY ====================
  INSERT INTO products (name, name_ar, category_id, supplier_id, unit, unit_ar, price, reorder_level) VALUES
    ('Wings', 'اجنحه', cat_kitchen, sup_om_samy, 'bag', 'كيس', 120, 3),
    ('Rice', 'ارز', cat_kitchen, sup_splayed, 'kg', 'ك', 39, 10),
    ('Emmental Cheese', 'امنتال', cat_kitchen, sup_om_samy, 'kg', 'ك', 620, 2),
    ('Hummus Burger', 'برجر حمص', cat_kitchen, sup_feegon, 'box', 'علبة', 225, 2),
    ('Mushroom Burger', 'برجر مشروم', cat_kitchen, sup_feegon, 'box', 'علبة', 225, 2),
    ('Digestive Biscuit', 'بسكوت ديجيستيف', cat_kitchen, sup_om_samy, 'bag', 'كيس', 60, 3),
    ('Green Peas Bag', 'بسلة كيس', cat_kitchen, sup_splayed, 'bag', 'كيس', 45, 5),
    ('French Fries', 'بطاطس فرايز', cat_kitchen, sup_splayed, 'carton', 'كرتونة', 750, 2),
    ('Pepperoni', 'بيبروني', cat_kitchen, sup_om_samy, 'kg', 'ك', 525, 2),
    ('Eggs Tray', 'بيض طبق', cat_kitchen, sup_splayed, 'tray', 'طبق', 159, 3),
    ('Beef Bacon', 'بيف بيكون', cat_kitchen, sup_om_samy, 'kg', 'ك', 589, 2),
    ('Smoked Turkey', 'تركي مدخن', cat_kitchen, sup_om_samy, 'kg', 'ك', 710, 2),
    ('Burger Spices', 'توابل برجر', cat_kitchen, sup_om_samy, 'carton', 'كرتونة', 13, 3),
    ('Blueberries', 'توت ازرق', cat_kitchen, sup_om_samy, 'bag', 'كيس', 195, 3),
    ('Shrimp', 'جمبري', cat_kitchen, sup_halwani, 'kg', 'ك', 1250, 2),
    ('Tahini Bucket', 'جردل طحينه', cat_kitchen, sup_splayed, 'bucket', 'جردل', 130, 2),
    ('Jalapeno Bucket', 'جردل هالبينو', cat_kitchen, sup_splayed, 'bucket', 'جردل', 550, 1),
    ('Lemon Juice', 'حامض ليمون', cat_kitchen, sup_splayed, 'bottle', 'زجاجة', 90, 3),
    ('Condensed Milk', 'حليب مكثف', cat_kitchen, sup_moraa, 'can', 'علبة', 87, 5),
    ('Vinegar', 'خل', cat_kitchen, sup_splayed, 'bottle', 'زجاجة', 13, 3),
    ('Apple Cider Vinegar', 'خل تفاح', cat_kitchen, sup_om_samy, 'bottle', 'زجاجة', 166, 2),
    ('Burger Mix', 'خلطه برجر', cat_kitchen, sup_om_samy, 'carton', 'كرتونة', 13, 3),
    ('Pickled Cucumbers', 'خيار مخلل', cat_kitchen, sup_splayed, 'bucket', 'جردل', 550, 1),
    ('Pomegranate Molasses', 'دبس رمان', cat_kitchen, sup_splayed, 'bottle', 'زجاجة', 218, 2),
    ('Dahy Flour', 'دقيق الضحي', cat_kitchen, sup_splayed, 'kg', 'ك', 31, 5),
    ('Pizza Flour', 'دقيق بيتزا', cat_kitchen, sup_helmar, 'sack', 'شيكارة', 2025, 1),
    ('Fat/Lard', 'دهن', cat_kitchen, sup_meats, 'kg', 'ك', 112, 3),
    ('Butter', 'زبده فيرن', cat_kitchen, sup_splayed, 'kg', 'ك', 145, 3),
    ('Water Bottle', 'زجاجة مياه', cat_kitchen, NULL, 'carton', 'كرتونة', 95, 5),
    ('Olive Oil', 'زيت زيتون', cat_kitchen, sup_sharq, 'bottle', 'زجاجة', 145, 3),
    ('Cooking Oil', 'زيت طعام', cat_kitchen, sup_splayed, 'bottle', 'زجاجة', 107, 3),
    ('Frying Oil 20L', 'زيت قلية 20لتر', cat_kitchen, sup_splayed, 'jerkin', 'جركن', 1320, 1),
    ('Salmon Portion', 'سالمون برشن', cat_kitchen, sup_halwani, 'portion', 'برشن', 200, 3),
    ('Sausage', 'سجق', cat_kitchen, sup_amkay, 'kg', 'ك', 400, 2),
    ('Smoked Salmon', 'سلامون مدخن', cat_kitchen, sup_om_samy, 'portion', 'برشن', 148, 3),
    ('Sweet Potato', 'سويت بوتيتو', cat_kitchen, sup_alamiya, 'carton', 'كرتونة', 750, 2),
    ('Sweet Corn', 'سويت كورن', cat_kitchen, sup_splayed, 'can', 'علبة', 42, 5),
    ('Red Cheddar Kg', 'شيدر احمر كيلو', cat_kitchen, sup_mustafa, 'kg', 'ك', 558, 2),
    ('Chicken Taouk', 'شيش طاووق', cat_kitchen, sup_tamry, 'kg', 'ك', 299, 3),
    ('Tomato Sauce 370g', 'صلصة 370جرام', cat_kitchen, sup_splayed, 'palette', 'بالتة', 380, 2),
    ('Ranch Sauce', 'صوص رانش', cat_kitchen, sup_splayed, 'gallon', 'جالون', 410, 1),
    ('Chocolate Sauce', 'صوص شوكليت', cat_kitchen, sup_jet, 'bag', 'كيس', 200, 2),
    ('Cheddar Sauce Milkana', 'صوص شيدر ميلكانا', cat_kitchen, sup_sharq, 'bag', 'كيس', 214, 2),
    ('Caramel Sauce', 'صوص كراميل', cat_kitchen, sup_jet, 'bag', 'كيس', 200, 2),
    ('Dark Soy Sauce', 'صويا صوص غامق', cat_kitchen, sup_splayed, 'can', 'علبة', 215, 2),
    ('Dried Tomatoes 200g', 'طماطم مجففه 200جم', cat_kitchen, sup_splayed, 'can', 'علبة', 105, 3),
    ('Pickled Olives', 'علبة زيتون مخلل', cat_kitchen, sup_splayed, 'bucket', 'جردل', 100, 2),
    ('Small Burger Bun', 'عيش برجر صغير', cat_kitchen, sup_smiley, 'piece', 'عدد', 8, 20),
    ('Large Burger Bun', 'عيش برجر كبير', cat_kitchen, sup_smiley, 'piece', 'عدد', 11, 20),
    ('Taco Bread', 'عيش تاكو', cat_kitchen, sup_kingm, 'palette', 'بالتة', 850, 1),
    ('Large Tortilla', 'عيش تورتيلا كبير', cat_kitchen, sup_kingm, 'palette', 'بالتة', 330, 1),
    ('Toast Bread', 'عيش توست', cat_kitchen, sup_birdfst, 'bag', 'كيس', 100, 5),
    ('Walnut', 'عين جمل', cat_kitchen, sup_om_abuouf, 'kg', 'ك', 850, 2),
    ('Gas Canister', 'غاز', cat_kitchen, sup_om_samy, 'canister', 'انبوبة', 60, 2),
    ('Fava Beans', 'فاصوليا', cat_kitchen, sup_om_samy, 'bag', 'كيس', 17, 5),
    ('Chocolate Volcano', 'فولكانو شوكلاته', cat_kitchen, sup_chef, 'piece', 'عدد', 40, 5),
    ('Lotus Volcano', 'فولكانو لوتس', cat_kitchen, sup_chef, 'piece', 'عدد', 45, 5),
    ('Fiji Burger', 'فيجي برجر', cat_kitchen, sup_feegon, 'box', 'علبة', 225, 2),
    ('Veal Schnitzel', 'فينا شيندذل', cat_kitchen, sup_feegon, 'box', 'علبة', 225, 2),
    ('Toast Loaf', 'قالب توست', cat_kitchen, sup_birdfst, 'loaf', 'قالب', 161, 3),
    ('Whipping Cream', 'كريمه خفق', cat_kitchen, sup_moraa, 'bottle', 'زجاجة', 250, 3),
    ('Cooking Cream', 'كريمه طهي', cat_kitchen, sup_moraa, 'bottle', 'زجاجة', 250, 3),
    ('Almond Milk', 'لبن الموند', cat_kitchen, sup_jet, 'bottle', 'زجاجة', 194, 3),
    ('Oat Milk', 'لبن شوفان', cat_kitchen, sup_jet, 'bottle', 'زجاجة', 194, 3),
    ('Milk Palette', 'لبن لتر', cat_kitchen, sup_johaina, 'palette', 'بالتة', 550, 1),
    ('Beef Veins', 'لحمة عروق', cat_kitchen, sup_amkay, 'vein', 'عرق', 3250, 1),
    ('Thigh Meat', 'لحمة وش فخدة', cat_kitchen, sup_factory, 'kg', 'ك', 400, 2),
    ('Lotus Jar 400g', 'لوتس برطمان 400جم', cat_kitchen, sup_jet, 'jar', 'علبة', 155, 2),
    ('Lotus Biscuit', 'لوتس بسكويت', cat_kitchen, sup_jet, 'bag', 'كيس', 165, 3),
    ('Halloumi Cheese', 'جبنه حلومي', cat_kitchen, sup_helmar, 'kg', 'ك', 210, 2),
    ('Cheddar Cheese', 'جبنه شيدر', cat_kitchen, sup_mustafa, 'kg', 'ك', 400, 2),
    ('Kiri Cheese', 'جبنه كيري', cat_kitchen, sup_helmar, 'box', 'علبة', 54.5, 5),
    ('Mozzarella Helmar', 'جبنه موزاريلا هيلمر', cat_kitchen, sup_helmar, 'kg', 'ك', 185, 2);

END;
$$;

-- Seed initial inventory for all branches (start with 0, will be populated via UI or import)
INSERT INTO inventory (product_id, branch_id, quantity)
SELECT p.id, b.id, 0
FROM products p
CROSS JOIN branches b
ON CONFLICT (product_id, branch_id) DO NOTHING;
