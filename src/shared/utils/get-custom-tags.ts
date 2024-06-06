import axios from "axios";

export const getCustomTags = async (domain:string) => {

    //const url = `https://mediajel-tracker-custom-tags-staging.s3.amazonaws.com/`;
    const url = `https://d3wuj95q2emo9.cloudfront.net/${domain}.js`
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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