import { Routes, Route } from "react-router-dom";
import "./App.css";
import { HomePage } from "./pages/HomePage";
import { SwapPage } from "./pages/SwapPage";
import { FuturesPage } from "./pages/FuturesPage";
import LayeredOptionsPage from "./pages/LayeredOptionsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/options" element={<LayeredOptionsPage />} />
      <Route path="/swap" element={<SwapPage />} />
      <Route path="/futures" element={<FuturesPage />} />
    </Routes>
  );
}

export default App;
