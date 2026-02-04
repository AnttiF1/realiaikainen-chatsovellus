## Reaaliaikainen Chat-sovellus

Reaaliaikainen chat-sovellus, jossa käyttäjät voivat liittyä nimettömänä tai nimettynä eri keskusteluhuoneisiin ja lähettää viestejä reaaliajassa.
Huoneeseen liityttäessä näkyy huoneen aiemmat viestit.

## Teknologiat

Frontend: Vite + React

Backend: Node.js + Express + Mongoose

Reaaliaikaisuus: Socket.io

## Ominaisuudet

Reaaliaikainen viestien lähetys ja vastaanotto

Keskusteluhuoneet

Huoneen vaihto

Huonekohtainen viestihistoria

Nimettömyys tai nimimerkin käyttö

## Asennus ja käynnistys

Lataa gitistä zippi tai git clone

Backend

cd backend
npm install
npm start


backend/.env

PORT=3001
MONGODBURI=(connectstringi)

Frontend
cd reaaliaikainen-chatsovellus/frontend
npm install
npm run dev

## Käyttö

Avaa sovellus selaimessa:
http://localhost:5173

Kirjoita nimi tai liity anonyyminä painamalla enter kun nimimerkki on valmis tyhjä = anonyymi/anonymous

Liity huoneeseen ja lähetä viestejä reaaliajassa

Vaihda huonetta tarvittaessa

Reaaliaikaisuuden testaus:
Avaa sovellus kahteen eri selaimeen ja liity samaan huoneeseen.
