const rooms = ['yleinen', 'pelit', 'off-topic'];

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
