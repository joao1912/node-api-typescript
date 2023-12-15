import { InternalError } from "@src/util/errors/internal-error";
import * as HTTPUtil from "@src/util/request";
import config, { IConfig } from "config";

export interface StormGlassPointSource {
    [key: string]: number;
}

export interface StormGlassPoint {

    readonly time: string;
    readonly waveHeight: StormGlassPointSource;
    readonly swellDirection: StormGlassPointSource;
    readonly swellHeight: StormGlassPointSource;
    readonly swellPeriod: StormGlassPointSource;
    readonly waveDirection: StormGlassPointSource;
    readonly windDirection: StormGlassPointSource;
    readonly windSpeed: StormGlassPointSource;

}

export interface StormGlassForecastResponse {
    hours: StormGlassPoint[];
}

export interface ForecastPoint {

    readonly time: string;
    readonly waveHeight: number;
    readonly swellDirection: number;
    readonly swellHeight: number;
    readonly swellPeriod: number;
    readonly waveDirection: number;
    readonly windDirection: number;
    readonly windSpeed: number;

}

export class ClientRequestError extends InternalError {

    constructor(message: string) {
        const internalMessage = 'Unexpected error when trying to communicate to StormGlass';
        super(`${internalMessage}: ${message}`);
    }

}

export class StormGlassResponseError extends InternalError {

    constructor(message: string) {
        const internalMessage = 'Unexpected error returned by the StormGlass service';
        super(`${internalMessage}: ${message}`);
    }
}

const stormGlassResourceConfig: IConfig = config.get('App.resources.StormGlass')

export class StormGlass {
    readonly stormGlassAPIParams = 'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed'
    readonly stormGlassAPISource = 'noaa'

    constructor( protected request = new HTTPUtil.Request()) {}

    public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {

        try {
            const response = await this.request.get<StormGlassForecastResponse>(
                `${stormGlassResourceConfig.get('apiUrl')}/weather/point?params=${this.stormGlassAPIParams}&source=${this.stormGlassAPISource}&end=1592113802&lat=${lat}&lng=${lng}`,
                {
                    headers: {
                        Authorization: stormGlassResourceConfig.get('apiToken')
                    }
                }
            );

            return this.normalizeReponse(response.data)
       
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            
            if (HTTPUtil.Request.isRequestError(err)) {
              throw new StormGlassResponseError(
                `Error: ${JSON.stringify(err.response?.data)} Code: ${
                  err.response?.status
                }`
              );
            }
      
            throw new ClientRequestError((err as Error).message);
          }
    }

    private normalizeReponse(points: StormGlassForecastResponse): ForecastPoint[] {


        return points.hours.filter(this.isValidPoint.bind(this)).map((point) => ({

            time: point.time,
            waveHeight: point.waveHeight[this.stormGlassAPISource],
            swellDirection: point.swellDirection[this.stormGlassAPISource],
            swellHeight: point.swellHeight[this.stormGlassAPISource],
            swellPeriod: point.swellPeriod[this.stormGlassAPISource],
            waveDirection: point.waveDirection[this.stormGlassAPISource],
            windDirection: point.windDirection[this.stormGlassAPISource],
            windSpeed: point.windSpeed[this.stormGlassAPISource]

        }))

    }

    private isValidPoint(point: Partial<StormGlassPoint>): boolean {

        return !!(
            point.time && 
            point.waveHeight?.[this.stormGlassAPISource] &&
            point.swellDirection?.[this.stormGlassAPISource] &&
            point.swellHeight?.[this.stormGlassAPISource] &&
            point.swellPeriod?.[this.stormGlassAPISource] &&
            point.waveDirection?.[this.stormGlassAPISource] &&
            point.windDirection?.[this.stormGlassAPISource] &&
            point.windSpeed?.[this.stormGlassAPISource]
        )

    }
}