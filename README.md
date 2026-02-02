Reaaliaikainen Chat-sovellus

Reaaliaikainen chat-sovellus, jossa käyttäjät voivat liittyä nimettömänä tai nimettynä eri keskusteluhuoneisiin ja lähettää viestejä reaaliajassa.
Huoneeseen liityttäessä näkyy huoneen aiemmat viestit.

Teknologiat

Frontend: Vite + React

Backend: Node.js + Express

Reaaliaikaisuus: Socket.io

Ominaisuudet

Reaaliaikainen viestien lähetys ja vastaanotto

Keskusteluhuoneet

Huoneen vaihto

Huonekohtainen viestihistoria

Nimettömyys tai nimimerkin käyttö

Asennus ja käynnistys
Backend
cd backend
npm install
npm start


backend/.env

PORT=3001
CLIENT_ORIGIN=http://localhost:5173

Frontend
cd reaaliaikainen-chatsovellus/frontend
npm install
npm run dev

Käyttö

Avaa sovellus selaimessa:
http://localhost:5173

Kirjoita nimi tai liity anonyyminä

Liity huoneeseen ja lähetä viestejä reaaliajassa

Vaihda huonetta tarvittaessa

Reaaliaikaisuuden testaus:
Avaa sovellus kahteen eri selaimeen ja liity samaan huoneeseen.

Huomio

Viestihistoria tallennetaan backendissä muistiin ja nollautuu, kun backend käynnistetään uudelleen.