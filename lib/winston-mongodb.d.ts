// Type definitions for winston-mongodb
// Project: https://github.com/winstonjs/winston-mongodb
// Definitions by: miton18 <https://github.com/miton18>, blove <https://github.com/blove>,
// Balazs Mocsai <https://github.com/mbale>

import { Logform, transports } from "winston";
import { MongoDBTransportInstance, MongoDBConnectionOptions } from 'winston-mongodb';

/**
 * Extending transport
 */
declare module 'winston/lib/winston/transports' {
    export interface Transports {
        MongoDB: MongoDBTransportInstance;
        MongoDBTransportOptions: MongoDBConnectionOptions;
    }
}

declare module 'winston-mongodb' {
    export interface MongoDBTransportInstance extends transports.StreamTransportInstance {
        new (options?: MongoDBConnectionOptions) : MongoDBTransportInstance;
        query: (callback: Function, options?: any) => Promise<any>;
    }

    /**
     * Options for transport
     *
     * @export
     * @interface MongoDBConnectionOptions
     */
    export interface MongoDBConnectionOptions {
       /**
        * Level of messages that this transport should log, defaults to 'info'.
        *
        * @type {string}
        * @memberof MongoDBConnectionOptions
        */
       level?: string;
       /**
        * Boolean flag indicating whether to suppress output, defaults to false.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       silent?: boolean;
       /**
        * MongoDB connection uri, pre-connected db object or promise object which will be resolved with pre-connected db object.
        *
        * @type {(string | Promise<any>)}
        * @memberof MongoDBConnectionOptions
        */
       db: string | Promise<any>;
       /**
        * MongoDB connection parameters (optional, defaults to {poolSize: 2, autoReconnect: true}).
        *
        * @type {*}
        * @memberof MongoDBConnectionOptions
        */
       options?: any;
      /**
       * The database name to connect to, defaults to DB name based on connection URI if not provided, ignored if using a pre-connected mongoose connection.
       *
       * @type {string}
       * @memberof MongoDBConnectionOptions
       */
      dbName?: string;
      /**
        * The name of the collection you want to store log messages in, defaults to 'log'.
        *
        * @type {string}
        * @memberof MongoDBConnectionOptions
        */
       collection?: string;
       /**
        * Boolean indicating if you want to store machine hostname in logs entry, if set to true it populates MongoDB entry with 'hostname' field, which stores os.hostname() value.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       storeHost?: boolean;
       /**
        * Label stored with entry object if defined.
        *
        * @type {string}
        * @memberof MongoDBConnectionOptions
        */
       label?: string;
       /**
        * Transport instance identifier. Useful if you need to create multiple MongoDB transports.
        *
        * @type {string}
        * @memberof MongoDBConnectionOptions
        */
       name?: string;
       /**
        * In case this property is true, winston-mongodb will try to create new log collection as capped, defaults to false.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       capped?: boolean;
       /**
        * Size of logs capped collection in bytes, defaults to 10000000.
        *
        * @type {number}
        * @memberof MongoDBConnectionOptions
        */
       cappedSize?: number;
       /**
        * Size of logs capped collection in number of documents.
        *
        * @type {number}
        * @memberof MongoDBConnectionOptions
        */
       cappedMax?: number;
       /**
        * Will try to reconnect to the database in case of fail during initialization. Works only if db is a string. Defaults to false.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       tryReconnect?: boolean;
       /**
        * Will remove color attributes from the log entry message, defaults to false.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       decolorize?: boolean;
       /**
        *  Will leave MongoClient connected after transport shut down.
        *
        * @type {boolean}
        * @memberof MongoDBConnectionOptions
        */
       leaveConnectionOpen?: boolean;
       /**
        * Configure which key is used to store metadata in the logged info object. Defaults to 'metadata' to remain compatible with the metadata format.
        *
        * @type {string}
        * @memberof MongoDBConnectionOptions
        */
       metaKey?: string;
       /**
        * Seconds before the entry is removed. Works only if capped is not set.
        *
        * @type {number}
        * @memberof MongoDBConnectionOptions
        */
       expireAfterSeconds?: number;

       format?: Logform.Format;
    }
    
    const MongoDB: MongoDBTransportInstance;
}
