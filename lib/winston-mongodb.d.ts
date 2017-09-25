// Type definitions for winston-mongodb
// Project: https://github.com/winstonjs/winston-mongodb
// Definitions by: miton18 <https://github.com/miton18>, blove <https://github.com/blove>

/// <reference types="winston" />

import { TransportInstance, Transports, Winston } from "winston";

declare namespace winston {
    export interface Winston {
        transports: WinstonMongoDBTransports;
    }
    export interface MongoDBTransportInstance extends TransportInstance {}
    export interface WinstonMongoDBTransports extends Transports {
        MongoDB: MongoDBTransportInstance;
    }
}

declare const winston: winston.Winston;
export = winston;
