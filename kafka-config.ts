export const config = {
    zkConStr: "localhost:2181/",
    logger: console.log.bind(console), // new log4bro({ level: "INFO" }),
    groupId: "kafka-streams-test",
    clientName: "kafka-streams-test-name",
    workerPerPartition: 1,
    options: {
        sessionTimeout: 8000,
        protocol: ["roundrobin"],
        fromOffset: "earliest", //latest
        fetchMaxBytes: 1024 * 100,
        fetchMinBytes: 1,
        fetchMaxWaitMs: 10,
        heartbeatInterval: 250,
        retryMinTimeout: 250,
        autoCommit: true,
        autoCommitIntervalMs: 1000,
        requireAcks: 0,
        //ackTimeoutMs: 100,
        //partitionerType: 3
    }
};
