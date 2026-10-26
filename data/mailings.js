/* POSTCARD MAILING CALENDAR
   One line per upcoming card. The spot picker (advertise page) and the mailing calendar page both read this.
   route:    must match the reservations Worker route id ("el-paseo", "sun-city-palm-desert").
   mail:     the date the card mails, "YYYY-MM-DD".
   deadline: artwork due date, "YYYY-MM-DD". After this date the card shows as closed for booking.
   minSold:  how many spots must be SOLD (paid) for the card to mail.
   Edited from the admin page (stats.html, "Mailing dates"), which commits this file through the tracker. Keep one card per line.
   When a card mails, change its dates to the next mailing (and release or carry over its spots in the Worker). */
window.CVS_MAILINGS = [
  {"route":"el-paseo","name":"El Paseo","area":"Palm Desert 92260, around El Paseo","homes":"About 5,000 homes","mail":"2026-11-27","deadline":"2026-11-16","minSold":8},
  {"route":"sun-city-palm-desert","name":"Sun City Palm Desert","area":"Sun City Palm Desert, 92211","homes":"About 4,800 homes","mail":"2026-11-27","deadline":"2026-11-16","minSold":8}
];
