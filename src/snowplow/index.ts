const createSnowplowTracker = async () => {
    const legacy = await import("~/snowplow/legacy")
    const standard = await import("~/snowplow/standard")
    return {
        legacy,
        standard,
    }
}

export default createSnowplowTracker