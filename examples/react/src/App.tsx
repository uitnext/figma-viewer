import { useState } from "react";
import { ReactFigmaViewer } from "uitnext-figma-viewer";
import "./App.css";
function App() {
  const [count, setCount] = useState(0);
  function onNodeSelected(e: CustomEvent) {}

  const [figmaUrl, setFigmaUrl] = useState(
    "https://www.figma.com/design/Klm6pxIZSaJFiOMX5FpTul9F/storybook-addon-designs-sample?node-id=64-1&t=4hbIExKhQZeOMUXV-4"
  );

  const [accessToken, setAccessToken] = useState(
    import.meta.env.VITE_FIGMA_ACCESS_TOKEN
  );

  function onNodeHovered(e: CustomEvent) {}
  return (
    <div>
      <div>
        <div>
          Figma Link: <input type="text" defaultValue={figmaUrl} />
        </div>
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          Access Token: <input type="password" defaultValue={accessToken} />
        </div>
        <button style={{ marginBottom: 8 }}>Load</button>
      </div>
      <div style={{ border: "1px solid", minHeight: 600 }}>
        <ReactFigmaViewer
          accessToken={accessToken}
          url={figmaUrl}
          onNodeSelected={onNodeSelected}
          onNodeHovered={onNodeHovered}
        />
      </div>
    </div>
  );
}

export default App;
