const rooms = ["yleinen", "teknologia", "Riveria", "urheilu", "musiikki", "elokuvat", "politiikka"];

function RoomSelector({ room, setRoom }) {
  return (
    <select value={room} onChange={(e) => setRoom(e.target.value)} className="room-select">
      {rooms.map((r) => (
        <option key={r} value={r}>{r.toUpperCase()}</option>
      ))}
    </select>
  );
}

export default RoomSelector;
