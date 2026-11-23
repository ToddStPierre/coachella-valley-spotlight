/* POSTCARD MAILING CALENDAR
   One line per upcoming card. The spot picker (advertise page) and the mailing calendar page both read this.
   route:    must match the reservations Worker route id ("el-paseo", "sun-city-palm-desert").
   mail:     the date the card mails, "YYYY-MM-DD".
   deadline: artwork due date, "YYYY-MM-DD". After this date the card shows as closed for booking.
   minSold:  how many spots must be SOLD (paid) for the card to mail.
   format:   "9x12" for the 20-spot Full/Half card (Dec 17, 2026 cards on). No format = the old 11 x 6 card with 16 spots.
   minDollars: 9x12 only. The card mails once this many dollars of ads (list price) are SOLD; minSold is ignored.
   Edited from the admin page (stats.html, "Mailing dates"), which commits this file through the tracker. Keep one card per line.
   Several cards per route can be open at once (2026-11-11): each card's spots are kept separately in the Worker.
   After a card mails, remove its line. Move unsold holds to a later card from the admin Postcard board. */
window.CVS_MAILINGS = [
  {"route":"el-paseo","name":"Palm Desert - El Paseo Area","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2026-11-27","deadline":"2026-11-16","minSold":8},
  {"route":"sun-city-palm-desert","name":"Palm Desert - Sun City","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2026-12-17","deadline":"2026-12-07","minSold":8},
  {"route":"la-quinta-pga-west","name":"La Quinta - PGA West","area":"La Quinta 92253, PGA West","homes":"4,677 homes","mail":"2026-12-17","deadline":"2026-12-07","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"el-paseo","name":"Palm Desert - El Paseo Area","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"sun-city-palm-desert","name":"Palm Desert - Sun City","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,916 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta-pga-west","name":"La Quinta - PGA West","area":"La Quinta 92253, PGA West","homes":"4,677 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indio","name":"Indio - Sun City Shadow Hills","area":"Indio 92203","homes":"4,791 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-01-21","deadline":"2027-01-11","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"el-paseo","name":"Palm Desert - El Paseo Area","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"sun-city-palm-desert","name":"Palm Desert - Sun City","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,916 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta-pga-west","name":"La Quinta - PGA West","area":"La Quinta 92253, PGA West","homes":"4,677 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indio","name":"Indio - Sun City Shadow Hills","area":"Indio 92203","homes":"4,791 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-02-18","deadline":"2027-02-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"el-paseo","name":"Palm Desert - El Paseo Area","area":"Palm Desert 92260, around El Paseo","homes":"4,968 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"sun-city-palm-desert","name":"Palm Desert - Sun City","area":"Sun City Palm Desert, 92211","homes":"4,829 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"palm-springs","name":"Palm Springs","area":"Palm Springs 92262 · 92264","homes":"4,979 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"cathedral-city","name":"Cathedral City","area":"Cathedral City 92234","homes":"4,993 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"rancho-mirage","name":"Rancho Mirage","area":"Rancho Mirage 92270","homes":"4,976 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indian-wells","name":"Indian Wells","area":"Indian Wells 92210","homes":"4,461 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta","name":"La Quinta","area":"La Quinta 92253","homes":"4,916 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"la-quinta-pga-west","name":"La Quinta - PGA West","area":"La Quinta 92253, PGA West","homes":"4,677 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"indio","name":"Indio - Sun City Shadow Hills","area":"Indio 92203","homes":"4,791 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"coachella","name":"Coachella","area":"Coachella 92236","homes":"4,998 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625},
  {"route":"desert-hot-springs","name":"Desert Hot Springs","area":"Desert Hot Springs 92240 · 92241","homes":"4,977 homes","mail":"2027-03-18","deadline":"2027-03-08","minSold":8,"format":"9x12","minDollars":2625}
];
