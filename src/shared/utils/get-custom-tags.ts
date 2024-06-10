import axios from "axios";

export const getCustomTags = async () => {

    //const url = `https://mediajel-tracker-custom-tags-staging.s3.amazonaws.com/`;
    const hname = window.location.hostname
    const url = `https://d3wuj95q2emo9.cloudfront.net/${Buffer.from(hname, 'utf-8').toString('base64')}.js`
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.info(`custom tag for ${hname} not found ${Buffer.from(hname, 'utf-8').toString('base64')}.js`);
      }
      const scriptText = await response.text();
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.text = scriptText;
      document.head.appendChild(script);
      console.log(`Successfully imported external script from ${url}`);
    } catch (error) {
      console.error(`Failed to import script from ${url}: ${error.message}`);
    }
  };