export const Component = ({ list, id }) => {
  return (
    <>
      <p id={id}></p>
      <ul id="hard-coded">
        {list.map(item => (
          <li key={item.key}>{item.text}</li>
        ))}
      </ul>
    </>
  );
};
