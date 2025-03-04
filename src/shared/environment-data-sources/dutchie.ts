import dutchieSubdomainDataSource from "./dutchie-subdomain";
import dutchieIframeDataSource from "./dutchie-iframe";
import dutchiePlusDataSource from "./dutchie-plus";

const dutchieDataSource = () => {
    dutchiePlusDataSource();
    dutchieIframeDataSource();
    dutchieSubdomainDataSource();
};

export default dutchieDataSource;