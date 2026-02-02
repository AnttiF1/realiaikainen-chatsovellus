Reaaliaikainen Chat-sovellus

Reaaliaikainen chat-sovellus, jossa käyttäjät voivat liittyä nimettömänä eri keskusteluhuoneisiin ja lähettää viestejä reaaliajassa. Huoneeseen liityttäessä näkyy huoneen aiemmat viestit.

Teknologiat

Frontend: Vite + React

Backend: Node.js + Express

Reaaliaikaisuus: Socket.io

Ominaisuudet

Reaaliaikainen viestien lähetys ja vastaanotto

Keskusteluhuoneet

Huoneen vaihto

Viestihistoria huonekohtaisesti

Nimettömyys

Asennus ja käynnistys
Backend
cd backend
npm install
npm start


backend/.env

PORT=3001
CLIENT_ORIGIN=http://localhost:5173

Frontend
cd chat-frontend
npm install
npm run dev


chat-frontend/.env

VITE_SOCKET_URL=http://localhost:3001

Käyttö

Avaa sovellus selaimessa (http://localhost:5173)

Kirjoita huoneen nimi ja liity

Lähetä viestejä reaaliajassa

Vaihda huonetta tarvittaessa

Testaa avaamalla sovellus kahteen selaimeen ja liity samaan huoneeseen.

Huomio

Viestihistoria tallennetaan muistiin ja nollautuu, kun backend käynnistetään uudelleen.