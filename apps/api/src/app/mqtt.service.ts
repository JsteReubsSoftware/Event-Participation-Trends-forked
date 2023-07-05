import { EventService } from '@event-participation-trends/api/event/feature';
import { IGetAllEventsRequest } from '@event-participation-trends/api/event/util';
import { SensorReading } from '@event-participation-trends/api/positioning';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SensorlinkingService } from '@event-participation-trends/sensorlinking';

@Injectable()
export class MqttService {
  private sensors: Array<string>;
  private macToId: Map<string, number>;
  private buffer: Array<any>;
  private idNum: number;

  constructor(
    private readonly eventService: EventService,
    private readonly sensorLinkingService: SensorlinkingService
  ) {
    this.sensors = new Array<string>();
    this.macToId = new Map<string, number>();
    this.buffer = new Array<any>();
    this.idNum = 0;
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
    // console.log(tempSensors);
    this.buffer.push(tempSensors);
  }

  @Interval(5000)
  async processBuffer() {
    console.log('processBuffer');
    if(this.buffer.length < 2) return;
    const extractRequest: IGetAllEventsRequest = {
      AdminEmail: '',
    };
    const events = []; //(await this.eventService.getAllEvent(extractRequest)).events;
    events.forEach((event) => {
      const sensors = new Set<any>();
      (event as any).thisFloorLayout?.children?.forEach((child: any) => {
        if (child.className === 'Image') {
          sensors.add({
            x: child.attrs.x,
            y: child.attrs.y,
            id: child.attrs.customId,
          });
        }
      });
      const tempBuffer: SensorReading[] = new Array<SensorReading>();
      sensors.forEach((sensor) => {
        const id = sensor.id;
        const sensorMac = this.sensorLinkingService.getMacAddress(id);
        //////////////////////////////////////////////////////////////////////////////
        this.buffer
          .filter((data) => data.sensorMac === sensorMac)
          .forEach((data) => {
            data.devices.forEach((device: any) => {
              tempBuffer.push({
                id: device.mac,
                signal_strength: device.rssi,
                timestamp: data.time,
                x: sensor.x,
                y: sensor.y,
              });
              console.log(tempBuffer);
            });
          });
        ///////////////////////////////////////////////////////////////////////////////
      });
    });
    this.buffer = new Array<any>();
  }
}
