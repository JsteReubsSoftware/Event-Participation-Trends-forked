import { AddDevicePosition, EventService } from '@event-participation-trends/api/event/feature';
import { IGetAllEventsRequest } from '@event-participation-trends/api/event/util';
import { PositioningService, SensorReading, KalmanFilter } from '@event-participation-trends/api/positioning';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SensorlinkingService } from '@event-participation-trends/api/sensorlinking';
import { Position } from '@event-participation-trends/api/event/data-access';
import { Matrix } from 'ts-matrix';

@Injectable()
export class MqttService {
  private sensors: Array<string>;
  private macToId: Map<string, number>;
  private buffer: Array<any>;
  private idNum: number;
  private filters: Map<number, KalmanFilter>;

  constructor(private readonly sensorLinkingService: SensorlinkingService, private readonly positioningService: PositioningService, private readonly eventService: EventService) {
    this.sensors = new Array<string>();
    this.macToId = new Map<string, number>();
    this.buffer = new Array<any>();
    this.idNum = 0;
    this.filters = new Map<number, KalmanFilter>();
  }

  async processData(data: any) {
    const tempSensors = {
      devices: new Array<any>(),
      sensorMac: data.sensorMac,
      time: data.time,
    };
    if (!this.sensors.includes(data.sensorMac)) {
      this.sensors.push(data.sensorMac);
    }
    data?.devices?.forEach((device) => {
      if (!this.sensors.includes(device.mac)) {
        if (!this.macToId.has(device.mac)) {
          this.macToId.set(device.mac, this.idNum++);
        }
        device.mac = this.macToId.get(device.mac);
        device.rssi = device.rssi * -1;
        tempSensors.devices.push(device);
      }
    });
    this.buffer.push(tempSensors);
  }

  @Interval(1000)
  async processBuffer() {
    const events = this.sensorLinkingService.events;
    this.sensorLinkingService.shouldUpdate = true;
    events
      ?.filter(
        (event) => event.StartDate < new Date() && event.EndDate > new Date()
      )
      .forEach(async (event) => {
        const sensors = new Set<any>();
        if (!event.FloorLayout) return;
        const thisFloorLayout = JSON.parse(
          event.FloorLayout as unknown as string
        );
        if (thisFloorLayout?.children === undefined) return;
        thisFloorLayout?.children?.forEach((child: any) => {
          if (child.className === 'Circle') {
            sensors.add({
              x: child?.attrs?.x,
              y: child?.attrs?.y,
              id: child?.attrs?.uniqueId || child?.attrs?.customId,
            });
          }
        });
        const positions = await this.anotherOne(sensors);

        this.buffer = new Array<any>();
        if(process.env['MQTT_ENVIRONMENT'] === 'production' && positions.length > 0)
          this.eventService.addDevicePosition({
            eventId: (event as any)._id,
            position: positions
          })
      });
  }

  async anotherOne(sensors: any): Promise<Position[]> {
    const tempBuffer = new Array<any>;
    for await (const sensor of sensors) {
      const id = sensor.id;
      const sensorMac = await this.sensorLinkingService.getMacAddress(id);
      this.buffer
        .filter((data) => data.sensorMac === sensorMac)
        .forEach((data) => {
          data.devices.forEach((device: any) => {
            tempBuffer.push({
              id: device.mac,
              distance: this.positioningService.rssiToDistance(device.rssi),
              timestamp: data.time,
              x: sensor.x,
              y: sensor.y,
            });
          });
        });
    }
    const positions = this.positioningService.getPositions(tempBuffer);

    if (!(process.env['MQTT_FILTER'] === 'kalman')) {
      return positions;
    }

    const filteredPositions = new Array<Position>();

    positions.map((position) => {
      let filter = this.filters.get(position.id);

      if (!filter) {
        filter = new KalmanFilter(
          position.x,
          position.y,
          position.timestamp.getTime() / 1000,
          0.003,
          0.5,
          0.5
        );
      }

      const estimated_position = filter.update(
        new Matrix(2, 1, [[position.x], [position.y]]),
        position.timestamp.getTime() / 1000
      );

      const filtered_position : Position = {
        id: position.id,
        x: estimated_position[0][0],
        y: estimated_position[1][0],
        timestamp: position.timestamp,
      };

      this.filters.set(position.id, filter);

      filteredPositions.push(filtered_position);
    });

    return filteredPositions;
  };
}
