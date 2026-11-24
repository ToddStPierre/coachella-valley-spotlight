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
  /* Town guides (2026-11-24): "Know before you go" on city/<slug>/ pages. tips = short plain sentences;
     faq = questions people search for, answered plainly (also sent to Google as FAQPage). Only facts that are true
     year after year: no prices, hours or dates that change. */
  guides: {
    "Palm Desert": {
      tips: [
        "The best weather runs from about October through April: warm days, cool nights. January through March is peak season, so restaurants and golf tee times fill up fast. Book ahead.",
        "Summer, roughly June through September, regularly passes 105 degrees. Do outdoor plans early in the morning, carry more water than you think you need, and expect some places to keep shorter summer hours.",
        "El Paseo is the town's main shopping and dining street, just south of Highway 111. It's busiest on winter evenings and weekends.",
        "Highway 111 runs through the middle of town and Interstate 10 runs along the north side. Most of the valley is a 10 to 30 minute drive away.",
        "Palm Springs International Airport (PSP) is the closest airport, about 25 minutes away by car."
      ],
      faq: [
        { q: "When is the best time to visit Palm Desert?", a: "October through April, when days are warm and nights are cool. January through March is the busiest stretch. Summer (June through September) is very hot, often over 105 degrees, but quieter." },
        { q: "How far is Palm Desert from the Palm Springs airport?", a: "About 15 miles, or roughly 25 minutes by car, from Palm Springs International Airport (PSP)." },
        { q: "What is El Paseo in Palm Desert?", a: "El Paseo is Palm Desert's main shopping and dining street, lined with shops, art galleries and restaurants just south of Highway 111." },
        { q: "What is there to do in Palm Desert?", a: "Shopping and dining on El Paseo, The Living Desert Zoo and Gardens, shows at the McCallum Theatre, golf, pickleball and tennis, and hiking trails in the hills on the south side of town. This page lists the trails, parks, courts and restaurants we have listed." }
      ]
    },
    "Palm Springs": { tips: [
        "Downtown runs along Palm Canyon Drive, with shops, galleries, restaurants and mid-century architecture all within walking distance.",
        "VillageFest, the weekly street fair, closes Palm Canyon Drive downtown on Thursday nights all year.",
        "The Palm Springs Aerial Tramway climbs to the top of Mount San Jacinto, where it's usually much cooler than the valley floor. Bring a jacket, even in summer.",
        "Palm Springs International Airport (PSP) is in town, about 10 minutes from downtown."
      ], faq: [
        {"q": "What is there to do in Palm Springs?", "a": "Walk Palm Canyon Drive downtown, go to VillageFest on a Thursday night, ride the Aerial Tramway up Mount San Jacinto, tour mid-century modern neighborhoods and hike nearby canyons. This page lists the trails, parks, courts and restaurants we have listed."},
        {"q": "When is VillageFest in Palm Springs?", "a": "Every Thursday night on Palm Canyon Drive downtown. Hours shift a little between summer and the rest of the year, so check the start time before you go."},
        {"q": "Is the top of the Palm Springs Aerial Tramway cooler?", "a": "Yes. The mountain station is high on Mount San Jacinto and is usually far cooler than the valley below, so a jacket is a good idea."}
      ] },
    "Desert Hot Springs": { tips: [
        "Desert Hot Springs sits on natural hot mineral water. Many small spa hotels here have mineral pools, and many sell day passes to people who aren't staying overnight.",
        "Cabot's Pueblo Museum is a hand-built, Hopi-inspired pueblo from the town's homestead days, owned by the city.",
        "The town is north of Interstate 10, so most of the valley is a short drive away on Palm Drive or Indian Canyon Drive.",
        "Palm Springs International Airport (PSP) is about 20 minutes away by car."
      ], faq: [
        {"q": "What is Desert Hot Springs known for?", "a": "Natural hot mineral water. The town grew up around it, and many spa hotels have pools filled with it."},
        {"q": "Can you visit the hot spring spas in Desert Hot Springs without staying overnight?", "a": "Many spa hotels in town sell day passes to their mineral pools. Call ahead, since rules and times vary by spa."},
        {"q": "What is there to do in Desert Hot Springs?", "a": "Soak at a mineral spa, tour Cabot's Pueblo Museum and enjoy wide desert views to the mountains. This page lists the parks, courts and restaurants we have listed."}
      ] },
    "Cathedral City": { tips: [
        "Cathedral City sits between Palm Springs and Rancho Mirage, along Highway 111 and Date Palm Drive.",
        "The downtown area near Highway 111 has the Mary Pickford movie theater, restaurants and the city's civic center.",
        "It's a central base for exploring the west valley: Palm Springs and Rancho Mirage are each just a few minutes away.",
        "Palm Springs International Airport (PSP) is about 15 minutes away by car."
      ], faq: [
        {"q": "Where is Cathedral City?", "a": "Between Palm Springs and Rancho Mirage in the western Coachella Valley, along Highway 111 and Date Palm Drive."},
        {"q": "How far is Cathedral City from the Palm Springs airport?", "a": "About 15 minutes by car from Palm Springs International Airport (PSP)."},
        {"q": "What is there to do in Cathedral City?", "a": "Catch a movie downtown, eat at family-run restaurants and use it as a central base for the rest of the west valley. This page lists the parks, courts and restaurants we have listed."}
      ] },
    "Thousand Palms": { tips: [
        "Acrisure Arena, home of the Coachella Valley Firebirds hockey team and big concerts, is in Thousand Palms near Interstate 10.",
        "The Coachella Valley Preserve has palm oases and desert trails on the San Andreas Fault. Entry is free (donations welcome). In summer the Thousand Palms Oasis area is open weekends only, so check hours first.",
        "Thousand Palms is unincorporated, north of Interstate 10 between Rancho Mirage and Palm Desert.",
        "Palm Springs International Airport (PSP) is about 20 minutes away by car."
      ], faq: [
        {"q": "Is Acrisure Arena in Palm Desert or Thousand Palms?", "a": "Acrisure Arena is in Thousand Palms, just north of Interstate 10. It's often described as being in Palm Desert because it's close by."},
        {"q": "Is the Coachella Valley Preserve free?", "a": "Yes, there is no admission fee, though donations are welcome. Summer hours are shorter, so check before you go."},
        {"q": "What is there to do in Thousand Palms?", "a": "See a Firebirds game or concert at Acrisure Arena and hike the palm oases at the Coachella Valley Preserve. This page lists the places and restaurants we have listed."}
      ] },
    "Rancho Mirage": { tips: [
        "Sunnylands Center and Gardens, the former Annenberg estate, has free admission and parking. It closes every summer, roughly early June to mid-September. The historic house is by ticketed tour only.",
        "Highway 111 through Rancho Mirage is lined with restaurants, resorts and shopping.",
        "Much of the city is country club and gated communities, so many golf courses here are private.",
        "Palm Springs International Airport (PSP) is about 20 minutes away by car."
      ], faq: [
        {"q": "Is Sunnylands free to visit?", "a": "Yes. The Center and Gardens have free admission and parking. They close for summer, roughly early June to mid-September, and tours of the historic house need a ticket."},
        {"q": "What is Rancho Mirage known for?", "a": "Resorts, country clubs, Sunnylands and Eisenhower Health. It has long been a getaway for celebrities and presidents."},
        {"q": "What is there to do in Rancho Mirage?", "a": "Walk the Sunnylands gardens in season, eat along Highway 111 and play golf at the resort courses. This page lists the parks, courts and restaurants we have listed."}
      ] },
    "Indian Wells": { tips: [
        "The Indian Wells Tennis Garden hosts the BNP Paribas Open every March, one of the biggest tennis tournaments in the world. Hotels and restaurants across the valley fill up that month.",
        "Indian Wells Golf Resort is the city's public golf resort, so you don't need a club membership to play.",
        "Resort hotels line Highway 111 through the city.",
        "Palm Springs International Airport (PSP) is about 25 to 30 minutes away by car."
      ], faq: [
        {"q": "When is the BNP Paribas Open in Indian Wells?", "a": "Every March, at the Indian Wells Tennis Garden. Book hotels and dinner reservations early that month."},
        {"q": "Can the public play golf in Indian Wells?", "a": "Yes. Indian Wells Golf Resort is open to the public. Many other courses in the city are private clubs."},
        {"q": "What is there to do in Indian Wells?", "a": "Watch tennis at the Tennis Garden, play golf at the public golf resort and relax at the resorts along Highway 111. This page lists the places and restaurants we have listed."}
      ] },
    "Bermuda Dunes": { tips: [
        "Bermuda Dunes is a small, mostly residential unincorporated community between Palm Desert and Indio, near Interstate 10 at Washington Street.",
        "It's built around the Bermuda Dunes Country Club and the small Bermuda Dunes Airport.",
        "Shopping and dining in Palm Desert, La Quinta and Indio are each a short drive away.",
        "Palm Springs International Airport (PSP) is about 25 to 30 minutes away by car."
      ], faq: [
        {"q": "Where is Bermuda Dunes?", "a": "Between Palm Desert and Indio, near Interstate 10 at Washington Street. It's an unincorporated part of Riverside County."},
        {"q": "Is Bermuda Dunes its own city?", "a": "No. It's an unincorporated community in Riverside County, served by county services."},
        {"q": "What is there to do in Bermuda Dunes?", "a": "It's mostly quiet neighborhoods and golf, with Palm Desert, La Quinta and Indio close by. This page lists the businesses and restaurants we have listed."}
      ] },
    "La Quinta": { tips: [
        "Old Town La Quinta has walkable shops, restaurants and events in the heart of the city.",
        "The Cove neighborhood backs up to the Santa Rosa Mountains, with popular hiking trails starting right from the streets. Start early, since there's little shade.",
        "La Quinta is a golf town. PGA West and La Quinta Country Club host the PGA Tour's American Express tournament every January.",
        "Palm Springs International Airport (PSP) is about 35 to 40 minutes away by car."
      ], faq: [
        {"q": "What is there to do in La Quinta?", "a": "Stroll Old Town La Quinta, hike the trails in the Cove, play golf at PGA West and other resort courses, and eat along Highway 111. This page lists the trails, parks, courts and restaurants we have listed."},
        {"q": "When is the golf tournament in La Quinta?", "a": "The PGA Tour's American Express is played every January at PGA West and La Quinta Country Club."},
        {"q": "How far is La Quinta from the Palm Springs airport?", "a": "About 35 to 40 minutes by car from Palm Springs International Airport (PSP)."}
      ] },
    "Indio": { tips: [
        "Indio is the largest city in the valley and calls itself the City of Festivals. Coachella and Stagecoach take over the Empire Polo Club each April, with heavy traffic and booked hotels across the valley on those weekends.",
        "The Riverside County Fair and National Date Festival is held at the fairgrounds in Indio every February.",
        "Most of the country's dates are grown in the Coachella Valley. Shields Date Garden in Indio, open since 1924, is famous for its date shake.",
        "Joshua Tree National Park's south entrance is about 25 miles east of Indio on Interstate 10."
      ], faq: [
        {"q": "Is the Coachella festival in Indio or Coachella?", "a": "Indio. The Coachella and Stagecoach festivals are held at the Empire Polo Club in Indio, not in the city of Coachella."},
        {"q": "When are the Coachella and Stagecoach festivals?", "a": "Every April at the Empire Polo Club in Indio: Coachella runs two weekends, then Stagecoach follows. Book hotels well ahead and expect heavy traffic."},
        {"q": "What is there to do in Indio?", "a": "Go to the festivals and the Date Festival, have a date shake at Shields Date Garden and head out to Joshua Tree's south entrance. This page lists the parks, courts and restaurants we have listed."}
      ] },
    "Coachella": { tips: [
        "The city of Coachella is in the east valley, surrounded by farms and date groves. The famous music festival is actually held next door in Indio.",
        "Downtown along Sixth Street and Pueblo Viejo has local restaurants, panaderias and markets.",
        "Joshua Tree National Park's south entrance is about 30 minutes away via Interstate 10.",
        "Palm Springs International Airport (PSP) is about 40 minutes away by car."
      ], faq: [
        {"q": "Is the Coachella festival held in the city of Coachella?", "a": "No. The festival is held at the Empire Polo Club in Indio, the city next door."},
        {"q": "What is the city of Coachella known for?", "a": "Farming. Dates, grapes, peppers and other crops are grown around the city, and it has a close-knit, mostly full-time community."},
        {"q": "What is there to do in Coachella?", "a": "Eat at local restaurants downtown, shop the markets and use it as a base for Joshua Tree's south entrance. This page lists the parks, courts and restaurants we have listed."}
      ] }
  },
  categories: {
    "Legal": "Legal covers locally based law firms and attorneys: estate planning, family law, criminal defense, bankruptcy, personal injury and business and real estate law. These are firms based in the valley, not national advertising networks. A listing here is not a recommendation or legal advice.",
    "Recreation": "Recreation covers places to play around the valley: free public pickleball and tennis courts at city parks, plus clubs you can join. Most public courts are first come, first served, and many are lit for evening play when it's cooler.",
    "Community": "Community covers public places residents use every week, starting with the valley's public libraries: the Riverside County Library System branches and the city libraries in Palm Springs, Rancho Mirage and Palm Desert.",
    "Attractions": "Attractions covers the valley's museums, gardens and landmark things to see, from the Aerial Tramway and the Air Museum to date farms and history museums.",
    "Outdoors": "Outdoors covers the valley's public hiking trails, from easy oasis walks to all-day mountain climbs in the Santa Rosa and San Jacinto Mountains. Start early, carry more water than you think you need, and check the managing agency's page for seasonal closures.",
    "Pets": "Pets covers the valley's independent veterinary clinics, animal hospitals and pet stores, plus the valley's public dog parks.",
    "Fitness": "Fitness covers the valley's independent gyms, CrossFit boxes, personal training studios and boxing and martial arts academies. These are locally owned, not the national chains.",
    "Shopping": "Shopping covers local stores around the valley, starting with golf shops: retail stores, club fitters and repair shops for one of the desert's favorite pastimes.",
    "Automotive": "Automotive covers local businesses that sell, service and rent vehicles, including the golf cars that are a common way to get around the valley's country clubs and gated communities.",
    "Home services": "Home services covers the trades that keep a desert home running: plumbing, air conditioning, roofing, pest control, flooring, solar panel cleaning and more. Summer heat, hard water and dust are tough on houses here, so it pays to have a local pro's number before you need it.",
    "Professional services": "Professional services covers local accountants, tax preparers, insurance agents, photographers and other pros who help households and small businesses.",
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
    "Pet grooming": "Local groomers for baths, haircuts, nail trims and de-shedding, from full salons to small one-groomer studios. Book ahead, especially before the holidays.",
    "Pet stores": "Independent pet stores for food, treats, toys and supplies, with staff who can help you choose the right diet. These are local shops, not the big-box chains.",
    "Nail salons": "Local nail salons for manicures, pedicures, gel, acrylics, dip powder and nail art, many with waxing and lash services too. Walk-ins are often welcome.",
    "Meditation": "Meditation teachers and centers in the valley, from personalized courses to free introductory talks, for stress relief, better sleep and a calmer mind.",
    "Med spas": "Local med spas offering injectables like Botox and fillers, skin treatments, weight loss programs and permanent makeup, in a spa setting with medical oversight.",
    "Libraries": "Public libraries across the valley. Six are Riverside County Library System branches, in Cathedral City, Coachella, Desert Hot Springs, Indio, La Quinta and Thousand Palms. Palm Springs, Rancho Mirage and Palm Desert run their own. All of them lend books, offer free Wi-Fi and run free programs for kids, teens and adults.",
    "Dog parks": "Public off-leash dog parks run by valley cities, most with separate areas for large and small dogs. Many close for a few weeks each fall for overseeding, so check the city page before you go.",
    "Hiking trails": "Public trails across the valley: palm oases in the Indian Canyons, National Monument trails above Palm Desert and Rancho Mirage, the La Quinta Cove, and high-country hikes from the Palm Springs Aerial Tramway. Some charge admission and some close seasonally or in summer heat.",
    "Pickleball": "Public pickleball courts across the valley, from Palm Springs' new 22-court Demuth Park complex to neighborhood parks in Palm Desert, La Quinta, Indio, Coachella and Rancho Mirage. Most are free and first come, first served, and some have lights and reservation times.",
    "Tennis": "Public tennis courts at city parks around the valley, from Palm Springs and Cathedral City to Coachella, free and mostly first come, first served, plus the Indian Wells Tennis Garden, home of the BNP Paribas Open.",
    "Swimming & water parks": "Public pools run by valley cities, the Palm Desert Aquatic Center with its slides and splash pad, and the valley's two wave pool surf parks. Hours change with the seasons, so check before you go, and summer is the busy time.",
    "Museums & attractions": "Museums, gardens and landmark attractions around the valley: aircraft at the Palm Springs Air Museum, the Aerial Tramway up Mount San Jacinto, The Living Desert, Sunnylands, Cahuilla culture, local history and a classic date shake. Some are free and many have seasonal hours.",
    "Skate parks": "City skate parks across the valley, from the Palm Springs Skate Park and its famous Nude Bowl to La Quinta's 31,000-square-foot X Park. Most are free, most require a helmet and pads, and several are lit for cooler evening sessions.",
    "Disc golf": "Disc golf courses in the valley: the free 9-hole course at the Palm Desert Soccer Park and the 18-hole course at Palm Royale in La Quinta. Helix Disc Golf runs local leagues and tournaments.",
    "Bowling": "Bowling in the valley: Fantasy Lanes at Fantasy Springs with weekend laser bowling, Palm Springs Lanes in Cathedral City for leagues and open play, and duckpin lanes with a pub at the Westin Rancho Mirage. A good way to beat the summer heat.",
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
    "Bakeries": "Local bakeries and pastry shops around the valley: French patisseries, bagel bakers, Jewish deli bakeries and custom cake and cookie shops. Many sell out early, so go in the morning.",
    "Golf shops": "Golf shops sell clubs, balls, bags and apparel, and many offer custom club fitting on a launch monitor, regripping and repairs. Pre-owned and rental clubs are easy to find here, since so many visitors fly in without their own.",
    "RV sales and service": "RV dealers, service centers and repair shops for motorhomes, travel trailers and fifth wheels, including mobile techs who come to your RV park or driveway. Busiest in fall, when snowbirds roll back into the valley.",
    "Golf cars": "Golf car dealers sell new and used carts, handle service and repairs, and rent carts by the day, week or season. Demand picks up every fall when seasonal residents come back.",
    "Plumbing": "Plumbers here deal with a lot of hard water, slab leaks, water heaters that wear out early in the heat, and drains and sewer lines that need clearing. A local plumber who knows desert homes can usually get to you the same day.",
    "Roofing": "Desert sun is hard on roofs. Tile underlayment wears out, flat roofs need coating, and monsoon storms find every weak spot. Local roofers handle repairs, re-roofs and inspections for homes, businesses and mobile homes.",
    "Heating and air conditioning": "Air conditioning is not optional here, with summer days well over 110 degrees. Local HVAC companies handle repairs, tune-ups, maintenance plans and new systems, and the good ones answer the phone in July.",
    "Pest control": "Desert homes see scorpions, roaches, ants, spiders, rodents and gophers. Local pest control companies offer one-time treatments and regular service for homes and businesses.",
    "Flooring": "Local flooring companies install tile, vinyl, carpet and wood-look floors, and many offer free in-home estimates. Tile and luxury vinyl are popular here because they hold up to heat, sand and pets.",
    "Solar panel cleaning": "Dust and wind leave a film on solar panels that cuts how much power they make. Local crews clean panels and pressure wash driveways, patios and buildings for homes and businesses.",
    "Wallpaper installation": "Wallpaper installers hang everything from a single accent wall to murals and premium wallcoverings, and prep the walls so it lasts.",
    "Acupuncture": "Local acupuncturists offer acupuncture and herbal medicine for pain, stress, autoimmune conditions and overall wellness. These are licensed, independent practices.",
    "Weight loss": "Local medical weight loss clinics offer physician-supervised programs, including GLP-1 medications, B12 injections and nutrition guidance.",
    "Italian restaurants": "Locally owned Italian restaurants serving pasta, pizza and dinner with a bar, from long-running family dining rooms to newer spots.",
    "Breweries": "Local craft breweries and taprooms brewing their own beer in the valley, with weekly events like trivia nights and live music.",
    "Auto repair": "Independent auto repair shops for brakes, alignment, A/C, diagnostics, tires and smog checks. Desert heat is hard on batteries, cooling systems and A/C, so a trusted local mechanic is worth having.",
    "Garage doors": "Garage door companies install and repair doors, springs and openers, plus driveway gate operators. Heat, wind and sun wear out springs and seals faster here.",
    "Plant nurseries": "Nurseries selling desert trees, palms, cactus, succulents and shrubs that can handle a valley summer, often grown right here.",
    "Gift shops": "Local gift and card shops for greeting cards, gifts, ornaments and seasonal decor.",
    "Knife sharpening": "Local sharpeners for kitchen knives, salon and grooming shears, clipper blades and garden tools, so your edges cut clean again without buying new.",
    "Custom printing": "Local print shops for custom t-shirts, screen printing, embroidery and branded merch for businesses, teams and events.",
    "Flea & vintage markets": "Open-air flea and vintage markets where dozens of dealers sell antiques, mid-century and Modernism-era furniture, decor, clothing and collectibles. Most run on set weekends in the cooler months, so check the dates before you go.",
    "Cleaning services": "Local cleaning companies for offices and vacation rentals, including Airbnb turnovers between guests. Ask for a free estimate and what is included.",
    "Refill and zero-waste shops": "Shops where you can refill everyday products and cut down on single-use packaging, from soap and hair care to kitchen goods.",
    "Seafood markets": "Places to buy seafood to cook at home, including sellers at the valley's farmers markets.",
    "Physical therapy": "Physical therapy clinics for injuries, surgery recovery, sports medicine and ongoing pain, some with occupational and speech therapy too.",
    "Facials and skin care": "Estheticians for custom facials, dermaplaning, hydrodermabrasion and regular skin care.",
    "Family doctors": "Family practice doctors and nurse practitioners for checkups and everyday care for all ages.",
    "Date shakes": "The valley's signature treat: date shakes made with Medjool dates, many grown right here.",
    "Farms and CSA boxes": "Local farms selling produce, meat, honey and eggs through farmers markets and CSA boxes.",
    "Tire shops": "Tire shops for new tires, wheels and tire service.",
    "Natural foods markets": "Natural foods stores for organic groceries, vitamins and supplements.",
    "Lashes and brows": "Estheticians for eyelash extensions, eyebrow shaping and waxing, and microblading.",
    "Women's organizations": "Local organizations offering women mentorship, coaching and community.",
    "Podiatrists": "Foot and ankle doctors for surgery, diabetic foot care, wound care and everyday foot pain.",
    "Smog check": "Smog inspection stations for registration renewals, title transfers and out-of-state vehicles.",
    "BBQ & grill cleaning": "Mobile BBQ and grill cleaning services that come to your home to deep-clean, de-grease and service your grill, plus parts, repair and preventative maintenance. A clean grill cooks better and cuts the risk of a grease fire.",
    "Chiropractors": "Local chiropractors for back and neck pain, sports injuries and family care, including prenatal and pediatric chiropractic at some practices.",
    "Massage and day spas": "Day spas and massage studios around the valley, from deep tissue and relaxation massage to float therapy.",
    "Yoga and pilates": "Yoga, Pilates and barre studios with group classes and private sessions, from beginner-friendly flows to reformer Pilates.",
    "Handyman": "Handyman and property maintenance pros for repairs, odd jobs, pressure washing and window cleaning, for homes, HOAs and rentals.",
    "Dermatology": "Dermatology practices for skin checks, skin cancer treatment, acne care and cosmetic skin procedures. Sun protection matters in the desert.",
    "Optometrists": "Local optometrists for eye exams, contact lens fittings and eyewear. Desert sun and dust make regular eye care worth it.",
    "Hair salons and barbers": "Hair salons and barbershops for cuts, color, styling and grooming.",
    "Laundry service": "Local wash, dry and fold laundry services, with drop-off or pickup and delivery.",
    "Pool builders": "Pool builders design and build new pools and spas, and remodel older ones with new plaster, tile, decking and equipment. Ask about permits and how long the yard will be torn up.",
    "Tree care": "Arborists and tree services for desert trees and palms: health checks, treatment, trimming and removal. Monsoon winds make pruning before summer worth it.",
    "Painting": "House painters for interiors and exteriors. Desert sun fades and cracks exterior paint faster than most places, so stucco and trim need repainting more often.",
    "Window cleaning": "Window cleaners for homes and businesses, often with solar panel cleaning too. Dust storms and hard water spots make regular cleaning worth it here.",
    "Carpet cleaning": "Carpet, upholstery and rug cleaners, many also doing tile and grout. A good time to book is before the snowbirds arrive or after they leave.",
    "Blinds and shutters": "Window covering companies for shutters, blinds, solar shades and motorized shades. Blocking the afternoon sun can cut cooling bills noticeably.",
    "Glass and mirrors": "Glass contractors for shower enclosures, custom mirrors, table tops and glass repair.",
    "Wine and spirits": "Local wine shops and liquor stores, from boutique wine bars with weekly tastings to neighborhood stores with beer, spirits and cigars.",
    "Desserts and ice cream": "Ice cream, donuts and dessert shops for a treat after dinner or a hot afternoon.",
    "Waxing": "Waxing and sugaring studios for brows, Brazilians and full-body hair removal. Many book online.",
    "Orthopedics": "Orthopedic surgeons and sports medicine doctors for joints, bones, hands and sports injuries.",
    "Remodeling": "Kitchen and bath remodeling help, from appliance and fixture showrooms to design and installation.",
    "Legal document help": "Paralegal and legal document services for paperwork like divorce filings, deeds and probate, usually for less than a law firm. They can't give legal advice.",
    "Insurance": "Local insurance agents for home, auto, business, health and Medicare coverage. An independent agent can compare several companies for you.",
    "Bike shops": "Bike and e-bike shops for sales, rentals and repairs. Cooler months are the best time to ride the valley's bike paths.",
    "Furniture and home decor": "Furniture and home decor stores, including outdoor and patio furniture built for desert sun.",
    "Clothing boutiques": "Locally owned clothing boutiques for women, men and kids, from resort wear to custom suits and children's consignment.",
    "Jewelers": "Local jewelers for fine jewelry, custom pieces, watch service and repairs.",
    "Florists": "Florists and floral designers for arrangements, weddings and events.",
    "Dry cleaning and alterations": "Dry cleaners, alterations and shoe and leather repair. Some offer pickup and delivery.",
    "Golf courses": "Places to play golf, from public courses to indoor golf simulators you can play any time of year.",
    "Kids' classes": "Classes and programs for kids, from gymnastics and parkour to language lessons, after-school programs and camps.",
    "Art galleries": "Local art galleries and artist collections.",
    "Music lessons": "Music teachers and studios for voice, piano, guitar, violin and more, for kids and adults.",
    "Photographers": "Local photographers for weddings, families, portraits and events.",
    "Bars and nightclubs": "Local bars and lounges for drinks, games and a night out.",
    "Accounting and tax": "Local accountants, tax preparers and bookkeepers for individuals and small businesses. Book early in tax season."
  }
};
