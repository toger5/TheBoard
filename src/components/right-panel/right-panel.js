import jsxElem, { render } from "jsx-no-react";
 
function App(props) {
  return <div>Hello {props.name}</div>;
}
render(<App name="world" />, document.body);