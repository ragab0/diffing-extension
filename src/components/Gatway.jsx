import { useState } from "react";
import reactLogo from "../../public/assets/logo.png";

function GatwayApp() {
  const [count, setCount] = useState(0);
  return (
    <>
      <div>
        <a href="#" onClick={() => setCount((count) => count + 1)}>
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Diffing</h1>
      <div className="card">
        <button>{count}</button>
      </div>
    </>
  );
}

export default GatwayApp;
