/* POSTCARD MAILING CALENDAR
   One line per upcoming card. The spot picker (advertise page) and the mailing calendar page both read this.
   route:    must match the reservations Worker route id ("el-paseo", "sun-city-palm-desert").
   mail:     the date the card mails, "YYYY-MM-DD".
   deadline: artwork due date, "YYYY-MM-DD". After this date the card shows as closed for booking.
   minSold:  how many spots must be SOLD (paid) for the card to mail.
   Edited from the admin page (stats.html, "Mailing dates"), which commits this file through the tracker. Keep one card per line.
   Several cards per route can be open at once (2026-11-11): each card's spots are kept separately in the Worker.
   After a card mails, remove its line. Move unsold holds to a later card from the admin Postcard board. */
window.CVS_MAILINGS = [
  {"route":"el-paseo","name":"El Paseo","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2026-11-27","deadline":"2026-11-16","minSold":8},
  {"route":"sun-city-palm-desert","name":"Sun City Palm Desert","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2026-11-27","deadline":"2026-11-16","minSold":8},
  {"route":"el-paseo","name":"El Paseo","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"sun-city-palm-desert","name":"Sun City Palm Desert","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,995 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"indio","name":"Indio","area":"Indio 92201 · 92203","homes":"4,994 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8},
  {"route":"el-paseo","name":"El Paseo","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"sun-city-palm-desert","name":"Sun City Palm Desert","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,995 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"indio","name":"Indio","area":"Indio 92201 · 92203","homes":"4,994 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8},
  {"route":"el-paseo","name":"El Paseo","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"sun-city-palm-desert","name":"Sun City Palm Desert","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,995 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"indio","name":"Indio","area":"Indio 92201 · 92203","homes":"4,994 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8}
];
