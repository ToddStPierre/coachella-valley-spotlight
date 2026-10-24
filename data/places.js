/* CITY AND CATEGORY INTROS
   Used by tools/build-seo.js for the city and category pages under /local/
   (for example /local/palm-desert/ and /local/palm-desert/home-services/).
   services: intro for each specific service (the "service" field in directory.js). Add one when you add a new service.
   A page is only made once it has at least 2 listings. Google is only asked to index it at 3 or more.
   Plain text only. Keep each intro true and specific to the place. */
window.CVS = window.CVS || {};
window.CVS.places = {
  cities: {
    "Palm Springs": "Palm Springs sits at the west end of the Coachella Valley, under Mount San Jacinto. It is known for mid-century modern homes, the shops and restaurants along Palm Canyon Drive, and the Aerial Tramway up the mountain. Locals and seasonal residents keep a steady stream of work going for contractors, salons, restaurants and service pros all year.",
    "Cathedral City": "Cathedral City sits between Palm Springs and Rancho Mirage, along Highway 111 and Date Palm Drive. It is one of the valley's more affordable places to live, with a lot of full-time residents and family-run businesses. Many of the trades and service companies that work across the west valley are based here.",
    "Rancho Mirage": "Rancho Mirage is home to resorts, country clubs, Sunnylands and Eisenhower Health. It has a lot of seasonal homes and gated communities, and people here lean on trusted local pros for pools, landscaping, home care and dining.",
    "Palm Desert": "Palm Desert is the middle of the Coachella Valley and its main shopping and dining hub. It has El Paseo, the McCallum Theatre, The Living Desert and College of the Desert, plus neighborhoods like Sun City Palm Desert. Its residents call local businesses for everything from roofing and air conditioning to dinner on El Paseo.",
    "Indian Wells": "Indian Wells is a small, mostly residential city known for golf resorts and the Indian Wells Tennis Garden. Many homes here are in country club communities, and owners want reliable, well-reviewed local service pros.",
    "La Quinta": "La Quinta runs from Highway 111 south into the Santa Rosa Mountains. It is known for PGA West, Old Town La Quinta and a lot of newer neighborhoods, and many full-time families and seasonal residents look for local trades, health and dining here.",
    "Indio": "Indio is the largest city in the Coachella Valley. It hosts the Coachella and Stagecoach festivals at the Empire Polo Club and the Riverside County Fair and National Date Festival. It has a big, growing population of full-time residents and a lot of local, family-owned businesses.",
    "Coachella": "The city of Coachella is in the east valley. It is surrounded by farms and date groves and has a fast-growing, mostly full-time population. Local restaurants, markets and service companies here serve families across the east valley.",
    "Desert Hot Springs": "Desert Hot Springs is on the north side of Interstate 10. It is known for natural hot mineral water and the spa hotels built on it. It is a growing city of full-time residents, and many trades that work valley-wide are based here.",
    "Bermuda Dunes": "Bermuda Dunes is an unincorporated community between Palm Desert and Indio, built around the Bermuda Dunes Country Club and the small Bermuda Dunes Airport.",
    "Thousand Palms": "Thousand Palms is an unincorporated community north of Interstate 10. It is home to Acrisure Arena and the Coachella Valley Preserve."
  },
  categories: {
    "Legal": "Legal covers locally based law firms and attorneys: estate planning, family law, criminal defense, bankruptcy, personal injury and business and real estate law. These are firms based in the valley, not national advertising networks. A listing here is not a recommendation or legal advice.",
    "Pets": "Pets covers the valley's independent veterinary clinics, animal hospitals and pet stores, plus the valley's public dog parks.",
    "Fitness": "Fitness covers the valley's independent gyms, CrossFit boxes, personal training studios and boxing and martial arts academies. These are locally owned, not the national chains.",
    "Automotive": "Automotive covers local businesses that sell, service and rent vehicles, including the golf cars that are a common way to get around the valley's country clubs and gated communities.",
    "Home services": "Home services covers the trades that keep a desert home running: plumbing, air conditioning, roofing, pest control, flooring, solar panel cleaning and more. Summer heat, hard water and dust are tough on houses here, so it pays to have a local pro's number before you need it.",
    "Health and beauty": "Health and beauty covers local clinics, acupuncture, weight loss, salons, spas and wellness practices. These are independent, locally run practices, not national chains.",
    "Restaurants": "Restaurants covers locally owned places to eat, from long-running family dining rooms to newer spots. Many offer deals listed here when you mention Coachella Valley Spotlight."
  },
  services: {
    "Pool service": "With a pool in so many desert backyards, local pool companies handle weekly cleaning and chemicals, pump and filter repairs, tile cleaning and calcium removal.",
    "Landscaping": "Local landscapers design and maintain desert yards: drought-smart planting, hardscape, fire features, artificial turf, palms and irrigation.",
    "Estate planning": "Local estate planning attorneys draft trusts, wills and powers of attorney and handle trust administration and probate. With so many retirees and second homes in the valley, this is one of the most common legal needs here.",
    "Family law": "Local family law attorneys handle divorce, child custody and support, mediation and prenuptial agreements. Cases from the valley are heard at the Riverside County courthouse in Indio.",
    "Criminal defense": "Local criminal defense attorneys handle DUI, domestic violence, drug and felony cases. Most valley cases go through the Larson Justice Center in Indio.",
    "Bankruptcy": "Local bankruptcy attorneys help people and businesses with Chapter 7, Chapter 13 and other debt relief.",
    "Personal injury": "Local personal injury attorneys handle car and truck accidents, dog bites, falls and wrongful death claims, usually on a contingency fee.",
    "Business and real estate law": "Local business and real estate attorneys handle company formation, contracts, property deals, landlord and tenant matters, HOAs and business disputes.",
    "Pet stores": "Independent pet stores for food, treats, toys and supplies, with staff who can help you choose the right diet. These are local shops, not the big-box chains.",
    "Med spas": "Local med spas offering injectables like Botox and fillers, skin treatments, weight loss programs and permanent makeup, in a spa setting with medical oversight.",
    "Dog parks": "Public off-leash dog parks run by valley cities, most with separate areas for large and small dogs. Many close for a few weeks each fall for overseeding, so check the city page before you go.",
    "Veterinarians": "Independent veterinarians and animal hospitals for checkups, vaccines, surgery and urgent care.",
    "Dentists": "Independent dental practices across the valley offering family, cosmetic and restorative dentistry. These are locally run offices, not the big dental chains.",
    "Orthodontists": "Local orthodontists offering braces and clear aligners for kids and adults.",
    "Electrical": "Local electricians handle panel upgrades, lighting, repairs, EV chargers and new work for homes and businesses. Desert heat puts a heavy load on wiring and panels, so upgrades are common.",
    "Gyms": "Independent gyms with memberships, open gym, classes and personal training, including several open 24 hours.",
    "CrossFit gyms": "CrossFit boxes run by local coaches, with group classes, open gym and drop-ins for visitors.",
    "Personal training": "Personal training studios offering one-on-one sessions, small groups and bootcamps.",
    "Boxing and martial arts": "Boxing clubs and martial arts academies teaching boxing, Brazilian jiu-jitsu, Muay Thai and MMA to kids and adults.",
    "Mexican restaurants": "Mexican food runs deep in the Coachella Valley, from family taquerias and birria spots in Coachella and Indio to long-running dining rooms in Palm Springs and Rancho Mirage. Many of these are family owned and have been open for decades.",
    "American restaurants": "Locally owned American restaurants: diners, bistros, grills and dinner spots serving burgers, steaks, breakfast and comfort food across the valley.",
    "Seafood restaurants": "Local seafood restaurants, from Mexican mariscos to fresh fish and sushi on El Paseo.",
    "Asian restaurants": "Locally owned Thai, Vietnamese and Japanese restaurants, including Thai street food, shabu shabu hot pot and teppanyaki.",
    "Mediterranean and European restaurants": "Locally owned Mediterranean, French, Belgian, Spanish and Central European restaurants, from casual bistros to dinner spots.",
    "Cafes and delis": "Local cafes, delis and dessert shops for breakfast, lunch and coffee.",
    "Pizza and burgers": "Local pizzerias and burger spots, the independent kind, not the national chains.",
    "Vegan restaurants": "Plant-based and vegan restaurants in the valley.",
    "Latin American restaurants": "Peruvian, Colombian and other Latin American cooking from local, family-run kitchens.",
    "Golf cars": "Golf car dealers sell new and used carts, handle service and repairs, and rent carts by the day, week or season. Demand picks up every fall when seasonal residents come back.",
    "Plumbing": "Plumbers here deal with a lot of hard water, slab leaks, water heaters that wear out early in the heat, and drains and sewer lines that need clearing. A local plumber who knows desert homes can usually get to you the same day.",
    "Roofing": "Desert sun is hard on roofs. Tile underlayment wears out, flat roofs need coating, and monsoon storms find every weak spot. Local roofers handle repairs, re-roofs and inspections for homes, businesses and mobile homes.",
    "Heating and air conditioning": "Air conditioning is not optional here, with summer days well over 110 degrees. Local HVAC companies handle repairs, tune-ups, maintenance plans and new systems, and the good ones answer the phone in July.",
    "Pest control": "Desert homes see scorpions, roaches, ants, spiders, rodents and gophers. Local pest control companies offer one-time treatments and regular service for homes and businesses.",
    "Flooring": "Local flooring companies install tile, vinyl, carpet and wood-look floors, and many offer free in-home estimates. Tile and luxury vinyl are popular here because they hold up to heat, sand and pets.",
    "Solar panel cleaning": "Dust and wind leave a film on solar panels that cuts how much power they make. Local crews clean panels and pressure wash driveways, patios and buildings for homes and businesses.",
    "Wallpaper installation": "Wallpaper installers hang everything from a single accent wall to murals and premium wallcoverings, and prep the walls so it lasts.",
    "Peptides": "Peptide suppliers provide research-grade peptides. Look for batch testing, clear sourcing and documentation with every order.",
    "Acupuncture": "Local acupuncturists offer acupuncture and herbal medicine for pain, stress, autoimmune conditions and overall wellness. These are licensed, independent practices.",
    "Weight loss": "Local medical weight loss clinics offer physician-supervised programs, including GLP-1 medications, B12 injections and nutrition guidance.",
    "Italian restaurants": "Locally owned Italian restaurants serving pasta, pizza and dinner with a bar, from long-running family dining rooms to newer spots."
  }
};
