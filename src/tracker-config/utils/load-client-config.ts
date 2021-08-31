import { EcommerceContext, TagContext } from '../../interface';



async function loadClientConfig(context: TagContext): Promise<void> {
    const { appId, client, retailId } = context
    const ecommerceContext: EcommerceContext = { appId, retailId }

    switch (client) {
        case "citycompassionatecaregivers": {
            const { default: func } = await import('../clients/city-compassionate-caregivers')
            func(ecommerceContext);
            break;
        }
    }

}

export { loadClientConfig }