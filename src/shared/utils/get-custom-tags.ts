export const getCustomTags = async () => {

    const hname = window.location.hostname
    var url = `${process.env.FRICTIONLESS_CUSTOMTAG_URL}/${Buffer.from(hname, 'utf-8').toString('base64')}.js`
    
    
    try {
    const response = await fetch(url);
    if (!response.ok) {
        console.info(`custom tag for ${hname} not found ${Buffer.from(hname, 'utf-8').toString('base64')}.js`);
        }
    else {
        const scriptText = await response.text();
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.text = scriptText;
        document.head.appendChild(script);
        console.log(`Successfully imported external script from ${url}`);
        }
    } catch (error) {
        console.error(`Failed to import script from ${url}: ${error.message}`);
    }
};