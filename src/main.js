import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import "./style.css";

const message = document.querySelector("#message");

function renderFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  message.textContent = params.get("message")?.trim() || "Hello world";
}

renderFromHash();
window.addEventListener("hashchange", renderFromHash);
