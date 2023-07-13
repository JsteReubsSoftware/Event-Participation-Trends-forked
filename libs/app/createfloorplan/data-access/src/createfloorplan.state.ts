import { Injectable } from '@angular/core';
import { AppApiService } from '@event-participation-trends/app/api';
import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { AddSensor, RemoveSensor, SetCreateFloorPlanState, SetSensors, UpdateActiveSensor, UpdateSensorLinkedStatus } from '@event-participation-trends/app/createfloorplan/util';
import { SetError } from '@event-participation-trends/app/error/util';
import Konva from 'konva';

export interface ISensorState {
    object: Konva.Image,
    isLinked: boolean,
}

// Once we know the interface for the create floor plan we can remove the comment from the line below
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateFloorPlanStateModel {
    activeSensor: ISensorState | null,
    sensors: ISensorState[]
}

@State<CreateFloorPlanStateModel>({
    name: 'createfloorplan',
    defaults: {
        activeSensor: null,
        sensors: []
    }
})

@Injectable()
export class CreateFloorPlanState {

    @Selector()
    static getSensors(state: CreateFloorPlanStateModel) {
        return state.sensors;
    }

    @Selector()
    static getActiveSensor(state: CreateFloorPlanStateModel) {
        return state.activeSensor;
    }

    constructor(
        private store: Store,
        private appApiService: AppApiService
    ) {}

    @Action(SetCreateFloorPlanState)
    setCreateFloorPlanState(ctx: StateContext<CreateFloorPlanStateModel>, { payload }: SetCreateFloorPlanState) {
        ctx.patchState(payload);
    }

    @Action(SetSensors)
    setSensors(ctx: StateContext<CreateFloorPlanStateModel>, { payload }: SetSensors) {
        try {
            const state = ctx.getState();
            const newState = {
                ...state,
                sensors: payload
            };
            return ctx.dispatch(new SetCreateFloorPlanState(newState));
        } catch (error) {
            return ctx.dispatch(new SetError((error as Error).message));
        }
    }

    @Action(AddSensor)
    async addSensor(ctx: StateContext<CreateFloorPlanStateModel>, { sensor }: AddSensor) {
        try {
            const state = ctx.getState();

            const response = this.appApiService.getNewEventSensorId();
            return response.subscribe((res: {id: string}) => {
                sensor.setAttr('customId', res.id);
      
                  const newSensorState = {
                    object: sensor,
                    isLinked: false
                  }
    
                const newState = {
                    ...state,
                    sensors: [...state.sensors, newSensorState]
                };
                return ctx.dispatch(new SetCreateFloorPlanState(newState));
            });           
        } catch (error) {
            return ctx.dispatch(new SetError((error as Error).message));
        }
    }

    @Action(RemoveSensor)
    async removeSensor(ctx: StateContext<CreateFloorPlanStateModel>, { sensorId }: RemoveSensor) {
        try {
            const state = ctx.getState();
            const newState = {
                ...state,
                sensors: state.sensors.filter((sensor: ISensorState) => sensor.object.getAttr('customId') !== sensorId)
            };
            return ctx.dispatch(new SetCreateFloorPlanState(newState));
        } catch (error) {
            return ctx.dispatch(new SetError((error as Error).message));
        }
    }

    @Action(UpdateSensorLinkedStatus)
    async updateSensorLinkedStatus(ctx: StateContext<CreateFloorPlanStateModel>, { sensorId, isLinked }: UpdateSensorLinkedStatus) {
        try {
            const state = ctx.getState();
            const newState = {
                ...state,
                sensors: state.sensors.map((sensor: ISensorState) => {
                    if (sensor.object.getAttr('customId') === sensorId) {
                        return {
                            ...sensor,
                            isLinked
                        }
                    }
                    return sensor;
                })
            };
            return ctx.dispatch(new SetCreateFloorPlanState(newState));
        } catch (error) {
            return ctx.dispatch(new SetError((error as Error).message));
        }
    }

    @Action(UpdateActiveSensor)
    async updateActiveSensor(ctx: StateContext<CreateFloorPlanStateModel>, { sensorId }: UpdateActiveSensor) {
        try {
            const state = ctx.getState();
            const newState = {
                ...state,
                activeSensor: state.sensors.find((sensor: ISensorState) => sensor.object.getAttr('customId') === sensorId) || null
            };

            return ctx.dispatch(new SetCreateFloorPlanState(newState));
        } catch (error) {
            return ctx.dispatch(new SetError((error as Error).message));
        }
    }
}