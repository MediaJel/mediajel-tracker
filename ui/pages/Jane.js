function Jane() {
  const environment = document.createElement("script");
  environment.src =
    "https://api.iheartjane.com/v1/brand_partners/164/embed.js/";
  environment.id = "jane-frame-script";
  document.body.appendChild(environment);
  return null;
}

export default Jane;
