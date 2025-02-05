import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, OnInit, AfterViewInit, NgZone } from '@angular/core';
import Konva from 'konva';
import { AppApiService } from '@event-participation-trends/app/api';
import { ActivatedRoute, Router } from '@angular/router';
import {Html5QrcodeScanner, Html5QrcodeScannerState} from "html5-qrcode";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IlinkSensorRequest } from '@event-participation-trends/api/sensorlinking';
import { NumberSymbol } from '@angular/common';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { NgIconsModule, provideIcons } from '@ng-icons/core';

import { heroUserGroupSolid } from "@ng-icons/heroicons/solid";
import { heroBackward } from "@ng-icons/heroicons/outline";
import { matKeyboardDoubleArrowUp, matKeyboardDoubleArrowDown, matRadioButtonUnchecked, matCheckCircleOutline } from "@ng-icons/material-icons/baseline";
import { matFilterCenterFocus, matZoomIn, matZoomOut } from "@ng-icons/material-icons/baseline";
import { SmallScreenModalComponent } from '../small-screen-modal/small-screen-modal.component';
import { LinkSensorModalComponent } from '../link-sensor-modal/link-sensor-modal.component';
import { ToastModalComponent } from '../toast-modal/toast-modal.component';
import { FloorplanUploadModalComponent } from '../floorplan-upload-modal/floorplan-upload-modal.component';
import { matDeleteRound } from '@ng-icons/material-icons/round';

export interface ISensorState {
  object: Konva.Circle,
  isLinked: boolean,
}

type KonvaTypes = Konva.Line | Konva.Image | Konva.Group | Konva.Text | Konva.Path | Konva.Circle | Konva.Label;

interface DroppedItem {
  name: string;
  konvaObject?: KonvaTypes;
}

interface UploadedImage {
  id: string;
  scale: number;
  type: string;
  base64: string;
}

@Component({
  selector: 'event-participation-trends-floorplan-editor-page',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    NgIconsModule,
    SmallScreenModalComponent,
    LinkSensorModalComponent,
    ToastModalComponent,
    FloorplanUploadModalComponent
  ],
  templateUrl: './floorplan-editor-page.component.html',
  styleUrls: ['./floorplan-editor-page.component.css'], 
  providers: [
    provideIcons({matDeleteRound, matCheckCircleOutline, matRadioButtonUnchecked, heroUserGroupSolid, heroBackward, matKeyboardDoubleArrowUp, matKeyboardDoubleArrowDown, matFilterCenterFocus, matZoomIn, matZoomOut})
  ],
})

export class FloorplanEditorPageComponent implements OnInit, AfterViewInit{
  // @Select(FloorPlanEditorState.getSensors) sensors$!: Observable<ISensorState[] | undefined>; 
  // @Select(FloorPlanEditorState.getActiveSensor) activeSensor$!: Observable<ISensorState | null>;
  // @Select(SubPageNavState.currentPage) currentPage$!: Observable<string | null>;
  // @Select(SubPageNavState.prevPage) prevPage$!: Observable<string | null>;
    @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLDivElement>;
    @ViewChild('canvasParent', { static: false }) canvasParent!: ElementRef<HTMLDivElement>;
    @ViewChild('dustbin', { static: false }) dustbinElement!: ElementRef<HTMLImageElement>;
    @ViewChild('stall', {static: false}) stallElement!: ElementRef<HTMLImageElement>;
    @ViewChild('textBox', {static: false}) textElement!: ElementRef<HTMLImageElement>;
    @ViewChild('textInput', {static: false}) textInputField!: ElementRef<HTMLInputElement>; // ION-INPUT
    linkingMenuVisible = true;
    lightMode = false;
    isDropdownOpen = false;
    openDustbin = false;
    canvasItems: DroppedItem[] = [];
    canvasContainer!: Konva.Stage;
    canvas!: Konva.Layer;
    isDraggingLine = false;
    lineType: 'vertical' | 'horizontal' = 'vertical';
    // activeLine: Konva.Line | null = null;
    activeItem: any = null;
    // lines: Konva.Line[] = [];
    transformer!: Konva.Transformer;
    preventCreatingWalls = true; // to prevent creating walls
    transformers: Konva.Transformer[] = [];
    sensors: ISensorState[] | undefined = [];
    gridSize = 10;
    paths: Konva.Path[] = [];
    activePath: Konva.Path | null = null;
    onDustbin = false;
    ctrlDown = false;
    mouseDown = false;
    gridBoundaries = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      bottom: 0,
      right: 0,
    };
    stageState = {
      stageScale: 1,
      stageX: 0,
      stageY: 0,
    };
    inputHasFocus = false;
    initialHeight = 0;
    scaleSnap = this.gridSize;
    scaleBy = 2;
    initialSnap = this.scaleSnap;
    displayedSnap = this.scaleSnap;
    initialGridSize = this.gridSize;
    currentScale = 1;
    gridLines !: Konva.Group;
    currentPathStrokeWidth = 0;
    currentGridStrokeWidth = 0;
    currentSensorCircleStrokeWidth = 1;
    snaps: number[] = [];
    wheelCounter = 0;
    contentLoaded = false;
    componentSize = this.gridSize;
    zoomInDisabled = false;
    zoomOutDisabled = false;
    centerDisabled = true;
    centerPosition = {x: 0, y: 0};
    gridSizeLabel = 0;
    snapLabel = 0;
    selectedWall = false;
    textBoxCount = 0;
    selectedTextBox = false;
    minWallLength = 0.5;
    textLength = 0;
    maxTextLength = 15;
    maxStallNameLength = 10;
    tooltips: Konva.Label[] = [];
    activePathStartPoint = {x: 0, y:0};
    activePathEndPoint = {x: 0, y:0};
    currentLabelFontSize = 0;
    currentLabelShadowBlur = 0;
    currentLabelShadowOffsetX = 0;
    currentLabelShadowOffsetY = 0;
    currentLabelPointerWidth = 0;
    currentLabelPointerHeight = 0;
    tooltipAllowedVisible = false;
    maxReached = false;
    selectedSensor = false;
    selectionGroup !: Konva.Group;
    prevSelectionGroup !: Konva.Group;
    selected : Konva.Shape[] = [];
    stallCount = 1;
    isLargeScreen = false;
    screenTooSmall = false;
    params: {
      m: string,
      id: string,
      queryParamsHandling: string
    } | null = null;
    currentPage!: string;
    prevPage!: string;
    alertPresented = false;
    isLoading = true;
    canvasObject!: {canvasContainer: Konva.Stage | null, canvas: Konva.Layer | null};
    prevSelections: Konva.Shape[] = [];
    emptiedSelection = false;
    STALL_IMAGE_URL = 'assets/stall-icon.png';
    eventId = '';
    hideScanner = true;
    showToast = true;
    uploadModalVisible = true;
    uploadedImageType = '';
    uploadedImageScale = 4;
    uploadedImageBase64 = '';
    uploadedImages: UploadedImage[] = [];
    showToastUploading = false;
    showToastSuccess = false;
    showToastError = false;
    toastHeading = '';
    toastMessage = '';
    existingFloorLayoutImages: UploadedImage[] = [];
    
    id = '';
    event: any | null | undefined = null;

    // change this value according to which true scale to represent (i.e. 1 block displays as 10m but when storing in database we want 2x2 blocks)
    TRUE_SCALE_FACTOR = 2; //currently represents a 2x2 block
    ratio = this.TRUE_SCALE_FACTOR / this.gridSize;

    constructor(
      private readonly appApiService: AppApiService,
      private readonly route: ActivatedRoute,
      private readonly formBuilder: FormBuilder, 
      // private readonly store: Store,
      // private alertController: AlertController,
      // private navController: NavController,  
      // private loadingController: LoadingController,
      // private toastController: ToastController,
      private router: Router, 
      private ngZone: NgZone,
    ) {
      for (let i = 1; i < 5; i++) {
        const snap = this.initialGridSize / i;
        this.snaps.push(snap);
      }
  
      this.params = {
        m: this.route.snapshot.queryParams['m'],
        id: this.route.snapshot.queryParams['id'],
        queryParamsHandling: this.route.snapshot.queryParams['queryParamsHandling']
      };
    }

    adjustValue(value: number) {
      return Math.round((value * this.ratio) * 100) / 100;
    }

    revertValue(value: number) {
      return Math.round((value / this.ratio) * 100) / 100;
    }

    convertX(x: number): number {
      return (x - this.canvasContainer.x()) / this.canvasContainer.scaleX();
    }

    convertY(y: number): number {
      return (y - this.canvasContainer.y()) / this.canvasContainer.scaleY();
    }

    getComponentsTitle(): string {
      if (this.preventCreatingWalls) {
        return 'Drag and drop a component to the canvas';
      } else {
        return 'Disable creating walls below to drag and drop a component to the canvas';
      }
    }

    getWallTitle(): string {
      if (this.preventCreatingWalls) {
        return 'Click button to enable creating walls';
      } else {
        return 'Click button to disable creating walls';
      }
    }

    getUploadImageTitle(): string {
      if (this.preventCreatingWalls) {
        return 'Upload an image of a floor plan';
      } else {
        return 'Disable creating walls above to upload an image of a floorplan to the canvas';
      }
    }

    toggleEditing(): void {
      this.preventCreatingWalls = !this.preventCreatingWalls;
      this.activeItem = null;
      this.textLength = 0;
      // this.store.dispatch(new UpdateActiveSensor(''));

      //remove all selected items
      this.transformers.forEach(transformer => {
        transformer.nodes([]);
      });

      // modify all elements such that they cannot be dragged when creating walls
      this.canvasItems.forEach(item => {
        if (!item.konvaObject) return;

        item.konvaObject?.setAttr('draggable', this.preventCreatingWalls);
        item.konvaObject?.setAttr('opacity', this.preventCreatingWalls ? 1 : 0.5);
        
        if (this.preventCreatingWalls){
          this.setMouseEvents(item.konvaObject);
        } else {
          this.removeMouseEvents(item.konvaObject);

          // set mouse enter and mouse leave events
          item.konvaObject?.on('mouseenter', () => {
            if (item.konvaObject?.getAttr('name') !== 'gridGroup') {
              document.body.style.cursor = 'not-allowed';
            }
          });
          item.konvaObject?.on('mouseleave', () => {
            document.body.style.cursor = 'default';
          });
        }
      });
    }

    toggleDropdown(): void {
        this.isDropdownOpen = !this.isDropdownOpen;
    }

    noItemsAdded(): boolean {
        return this.canvasItems.length === 0;
    }

    itemsAdded(): boolean {
        return this.canvasItems.length > 0;
    }

    onDragStart(event: DragEvent): void {
        const name = (event.target as HTMLElement).innerText;
        event.dataTransfer?.setData('text/plain', name);
    }
    
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.canvasContainer.setPointersPositions(event);
        const name = event.dataTransfer?.getData('text/plain');
        if (name) {
            const positionX = this.canvasContainer.getPointerPosition()?.x || 0;
            const positionY = this.canvasContainer.getPointerPosition()?.y || 0;
            const droppedItem: DroppedItem = { name };
            this.canvasItems.push(droppedItem);
            this.addKonvaObject(droppedItem, (positionX - this.canvasContainer.x()) / this.canvasContainer.scaleX() , (positionY - this.canvasContainer.y()) / this.canvasContainer.scaleY());
        }
    }

    async addKonvaObject(droppedItem: DroppedItem, positionX: number, positionY: number) {
      if (droppedItem.name.includes('png') || droppedItem.name.includes('jpg') || droppedItem.name.includes('jpeg') || droppedItem.name.includes('svg') || 1 == 1) {
        Konva.Image.fromURL(droppedItem.name, async (image) => {
          const imgSrc = image.image();
          image = new Konva.Image({
            image: imgSrc,
          });
          this.setupElement(image, positionX, positionY);
          if (droppedItem.name.includes('stall')) {
            image.setAttr('name', 'stallImage');
            image.setAttr('x', 0);
            image.setAttr('y', 0);
            this.stallCount = this.canvasItems.filter(item => item.konvaObject?.getAttr('name').includes('stall')).length + 1;

            const group = new Konva.Group({
              id: 'stall-' + this.stallCount,
              name: 'stall',
              x: positionX,
              y: positionY,
              width: this.componentSize,
              height: this.componentSize,
              draggable: true,
              cursor: 'move',
              fill: 'white',
              angle: 0,
            });
            
            const text = new Konva.Text({
              id: 'stallName',
              name: 'stallName',
              x: 0,
              y: 0,
              text: 'Stall-' + this.stallCount,
              fontSize: 1.5,
              fontFamily: 'Calibri',
              fill: 'black',
              width: this.componentSize,
              height: this.componentSize,
              align: 'center',
              verticalAlign: 'middle',
              padding: 3,
              cursor: 'move',
            });
            text.on('click', (e) => {
              this.setTransformer(group);
              // this.canvas.draw();
              // e.cancelBubble = true;
            });

            group.add(image);
            group.add(text);
            const tooltip = this.addTooltip(text, positionX, positionY);
            this.tooltips.push(tooltip);
            this.setMouseEvents(group);
            this.canvas.add(group);
            this.canvas.draw();
            this.reorderCanvasItems();
            droppedItem.konvaObject = group;
          } 
          else if (droppedItem.name.includes('sensor')) {
            image.setAttr('name', 'sensor');

            const sensor = this.canvas.findOne('.sensor');
            
            if (sensor) {
              this.currentSensorCircleStrokeWidth = sensor.getAttr('strokeWidth');
            }
            else if (this.currentScale !== 1){
              this.currentSensorCircleStrokeWidth = this.currentGridStrokeWidth;
            }
            else {
              this.currentSensorCircleStrokeWidth = 1;
            }

            // create circle to represent sensor
            const sensorCount = this.canvasItems.filter(item => item.konvaObject?.getAttr('name').includes('sensor')).length + 1;
            const circle = new Konva.Circle({
              id: 'sensor-' + sensorCount,
              name: 'sensor',
              x: positionX,
              y: positionY,
              radius: 2,
              fill: 'red',
              stroke: 'black',
              strokeWidth: this.currentSensorCircleStrokeWidth,
              draggable: true,
              cursor: 'move',
            });
            circle.setAttr('customId', this.getSelectedSensorId(circle));
            const uniqueId = await this.appApiService.getNewEventSensorId();
            circle.setAttr('uniqueId', uniqueId);
            const tooltip = this.addTooltip(circle, positionX, positionY);
            this.tooltips.push(tooltip);
            this.setMouseEvents(circle);
            this.canvas.add(circle);
            this.canvas.draw();
            this.reorderCanvasItems();
            droppedItem.konvaObject = circle;
            // this.store.dispatch(new AddSensor(circle));
            // this.sensors$.subscribe(sensors => {
            //   this.sensors = sensors;
            // });
          }
          else if (droppedItem.name.includes('text-selection')) {
            const name = 'textbox-' + this.textBoxCount++;

            // create a text object with default text which then allows the user to edit the text if they double click on it
            const text = new Konva.Text({
              id: name,
              name: 'textBox',
              x: positionX,
              y: positionY,
              text: 'Text',
              fontSize: 10,
              fontFamily: 'Calibri',
              fill: 'black',
              align: 'center',
              verticalAlign: 'middle',
              draggable: true,
              cursor: 'move',
              angle: 0,
            });
            text.setAttrs({
              width: text.text().length * text.fontSize() / 2,
              height: text.fontSize(),
            });

            this.setMouseEvents(text);
            this.canvas.add(text);
            this.canvas.draw();
            this.reorderCanvasItems();
            droppedItem.konvaObject = text;
          }
        });
      }
    }
    
    setupElement(element: KonvaTypes, positionX: number, positionY: number): void {
      element.setAttrs({
        x: positionX,
        y: positionY,
        width: this.componentSize,
        height: this.componentSize,
        cursor: 'move',
        draggable: true,
        cornerRadius: 2,
        padding: 20,
        fill: 'white',
        opacity: 1,
      });
    
      this.setMouseEvents(element);
    }

    setMouseEvents(element: KonvaTypes): void {
      element.on('dragmove', () => {
        this.activeItem = element;
        this.selectedTextBox = (this.activeItem instanceof Konva.Text || 
                                (this.activeItem instanceof Konva.Group && this.activeItem?.hasName('stall'))) ? true : false;
        this.setTransformer(this.activeItem, undefined);

        if (element instanceof Konva.Group || element instanceof Konva.Circle) {
          this.setTooltipVisibility(element, false);
        }

        if (this.activeItem instanceof Konva.Circle) {
          this.selectedSensor = true;
          // this.store.dispatch(new UpdateActiveSensor(this.activeItem.getAttr('customId')));
        }
        else {
          this.selectedSensor = false;
        }
      });
      element.on('dragmove', this.onObjectMoving.bind(this));
      element.on('click', () => {
        this.activeItem = element;
        this.selectedWall = this.activeItem instanceof Konva.Path ? true : false;        
        this.selectedTextBox = (this.activeItem instanceof Konva.Text || 
                                (this.activeItem instanceof Konva.Group && this.activeItem?.hasName('stall'))) ? true : false;
        this.setTransformer(this.activeItem, undefined);

        if (this.activeItem instanceof Konva.Group) {
          this.transformer.nodes([this.activeItem]);
          this.canvas.draw();
        }
        
        
        if (this.activeItem instanceof Konva.Text && this.activeItem.getAttr('name') === 'textBox') {
          this.selectedTextBox = true;
        }

        if (this.activeItem instanceof Konva.Circle) {
          this.selectedSensor = true;
          // this.store.dispatch(new UpdateActiveSensor(this.activeItem.getAttr('customId')));
        }
        else {
          this.selectedSensor = false;
        }
      });
      element.on('dragend', () => {
        this.openDustbin = false;
      });
      element.on('mouseenter', () => {
        document.body.style.cursor = 'move';
        if (!this.maxReached && (element instanceof Konva.Group || element instanceof Konva.Circle)) {
          this.setTooltipVisibility(element, true);
          setTimeout(() => {
            this.setTooltipVisibility(element, false);
          }, 2000);
        }
      });
      element.on('mouseleave', () => {
        document.body.style.cursor = 'default';
        if (element instanceof Konva.Group || element instanceof Konva.Circle) {
          this.setTooltipVisibility(element, false);
        }
      });

      if (element instanceof Konva.Text && (element.getAttr('name') === 'textBox' || element.getAttr('name') === 'stallName')) {
        element.on('dblclick', () => {
          this.activeItem = element;
          this.selectedTextBox = true;
          setTimeout(() => {
            this.textInputField.nativeElement.focus();
            // highlight the text in the input field
            this.textInputField.nativeElement.select();
          }, 10);
        });
        element.on('textChange', () => {
          const maxWidth = 8; // Update with your desired maximum width
          const lineHeight = element.getAttr('lineHeight');
          const text = element.getAttr('text');
          const fontSize = element.getAttr('fontSize');
          const fontFamily = element.getAttr('fontFamily');
          const fontStyle = element.getAttr('fontStyle');
      
          const tempText = new Konva.Text({
            text: text,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fontStyle: fontStyle,
          });
      
          const words = text.split(' ');
          let wrappedText = '';
          let currentLine = '';
      
          words.forEach((word: string) => {
            const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
            tempText.setAttr('text', testLine);
            const textWidth = tempText.width();
      
            if (textWidth > maxWidth) {
              wrappedText += (currentLine.length === 0 ? '' : currentLine + '\n');
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
      
          wrappedText += currentLine;
      
          element.setAttr('text', wrappedText);
          // element.setAttr('height', lineHeight * wrappedText.split('\n').length);
          element.getLayer()?.batchDraw();
        });
      }
    }

    removeMouseEvents(element: KonvaTypes): void {
      element.off('dragmove');
      element.off('dragmove');
      element.off('click');
      element.off('dragend');
      element.off('mouseenter');
      element.off('mouseleave');
    }

    setTooltipVisibility(element: KonvaTypes, visible: boolean): void {
      if (element instanceof Konva.Circle) {
        const tooltip = this.tooltips.find(tooltip => tooltip.getAttr('id').includes(element.getAttr('id')));
        tooltip?.setAttr('visible', visible);
      }
      else if (element instanceof Konva.Group) {
        // find text child of group
        const text = element.getChildren().find(child => child instanceof Konva.Text);
        const tooltip = this.tooltips.find(tooltip => tooltip.getAttr('id').includes(text?.getAttr('text')));
        tooltip?.setAttr('visible', visible);
      }
    }

    setAllTootipsVisibility(visible: boolean): void {
      this.tooltips.forEach(tooltip => {
        tooltip.setAttr('visible', visible);
      });
    }
      

    addTooltip(element: KonvaTypes, positionX: number, positionY: number): Konva.Label{
      const tooltipID = element.getAttr('text') ? element.getAttr('text') : element.getAttr('id');

      const alreadyExistingTooltip = this.tooltips.find(tooltip => tooltip.getAttr('id').includes(tooltipID));
      
      if (this.currentScale !== 1) {
        if (!alreadyExistingTooltip) {
          this.currentLabelPointerHeight = this.currentGridStrokeWidth * 4;
          this.currentLabelPointerWidth = this.currentGridStrokeWidth * 4;
          this.currentLabelShadowBlur = this.currentGridStrokeWidth * 10;
          this.currentLabelShadowOffsetX = this.currentGridStrokeWidth * 10;
          this.currentLabelShadowOffsetY = this.currentGridStrokeWidth * 10;
          this.currentLabelFontSize = this.currentGridStrokeWidth * 10;
        }
        else {
          this.currentLabelPointerHeight = this.currentLabelPointerHeight * 1;
          this.currentLabelPointerWidth = this.currentLabelPointerWidth * 1;
          this.currentLabelShadowBlur = this.currentLabelShadowBlur * 1;
          this.currentLabelShadowOffsetX = this.currentLabelShadowOffsetX * 1;
          this.currentLabelShadowOffsetY = this.currentLabelShadowOffsetY * 1;
          this.currentLabelFontSize = this.currentLabelFontSize * 1;          
        }
      }
      else {
        this.currentLabelPointerHeight = 4;
        this.currentLabelPointerWidth = 4;
        this.currentLabelShadowBlur = 10;
        this.currentLabelShadowOffsetX = 10;
        this.currentLabelShadowOffsetY = 10;
        this.currentLabelFontSize = 10;
      }

      if (alreadyExistingTooltip) {
        const tag = alreadyExistingTooltip.getChildren()[0];
        const text = alreadyExistingTooltip.getChildren()[1];

        tag.setAttr('pointerWidth', this.currentLabelPointerWidth);
        tag.setAttr('pointerHeight', this.currentLabelPointerHeight);
        tag.setAttr('shadowBlur', this.currentLabelShadowBlur);
        tag.setAttr('shadowOffsetX', this.currentLabelShadowOffsetX);
        tag.setAttr('shadowOffsetY', this.currentLabelShadowOffsetY );

        text.setAttr('fontSize', this.currentLabelFontSize);

        alreadyExistingTooltip.setAttr('x', element instanceof Konva.Circle ? positionX : positionX + 5);
        alreadyExistingTooltip.setAttr('y', element instanceof Konva.Circle ? positionY - 3 : positionY);
        return alreadyExistingTooltip;
      }

      const tooltip = new Konva.Label({
        id: 'tooltip-' + tooltipID,
        x: element instanceof Konva.Circle ? positionX : positionX + 5,
        y: element instanceof Konva.Circle ? positionY - 3 : positionY,
        opacity: 0.75,
        visible: false,
        listening: false,
      });
      tooltip.add(
        new Konva.Tag({
          fill: 'black',
          pointerDirection: 'down',
          pointerWidth: this.currentLabelPointerWidth,
          pointerHeight: this.currentLabelPointerHeight,
          lineJoin: 'round',
          shadowColor: 'black',
          shadowBlur: this.currentLabelShadowBlur,
          shadowOffsetX: this.currentLabelShadowOffsetX,
          shadowOffsetY: this.currentLabelShadowOffsetY,
          shadowOpacity: 0.5,
        })
      );
      tooltip.add(
        new Konva.Text({
          text: tooltipID,
          fontFamily: 'Calibri',
          fontSize: this.currentLabelFontSize,
          padding: 2,
          fill: 'white',
        })
      );
      this.canvas.add(tooltip);
      return tooltip;
    }

    updateTooltipID(element: KonvaTypes): void {
      let tooltipID = '';
      let text = null;
      let index = 0;

      if (!element) return;

      if (element instanceof Konva.Group) {
        tooltipID = element.getChildren().find(child => child instanceof Konva.Text)?.getAttr('text');
        text = element.getChildren().find(child => child instanceof Konva.Text) as Konva.Text;
      }
      else {
        tooltipID = element.getAttr('text') ? element.getAttr('text') : element.getAttr('id');
      }

      const isText = element instanceof Konva.Text;
      text = isText ? element : text;

      for (let i = 0; i < this.tooltips.length; i++) {
        if (this.tooltips[i].getAttr('id').includes(tooltipID)) {
          index = i;
          break;
        }
      }

      const newTooltip = 
        text ? 
        this.addTooltip(text, text.getParent()?.getAttr('x'), text.getParent()?.getAttr('y')) :
        this.addTooltip(element, element.getAttr('x'), element.getAttr('y'));
      this.tooltips[index] = newTooltip;
    }

    ngAfterViewInit(): void {
        // wait for elements to render before initializing fabric canvas
        setTimeout(() => {
          this.eventId = this.router.url.split('/')[2];
            this.displayedSnap = this.initialSnap;
            this.zoomOutDisabled = true;
            const canvasParent = this.canvasParent;

            // get width and height of the parent element
            const position = this.canvasElement.nativeElement.getBoundingClientRect();
            const positionX = position.x;
            const positionY = position.y;
            const width = canvasParent.nativeElement.offsetWidth;
            const height = canvasParent.nativeElement.offsetHeight;

            if (this.canvasObject) {
              this.canvasContainer = this.canvasObject['canvasContainer'] as Konva.Stage;
              this.canvas = this.canvasObject['canvas'] as Konva.Layer;
            }

            this.transformer = new Konva.Transformer({name: 'transformer'});
            this.transformers = [this.transformer];

            this.canvasContainer = new Konva.Stage({
              container: '#canvasElement',
              width: width*0.9873,                  //was width*0.9783,
              height: window.innerHeight-40,      //height*0.92,       
            });
            this.initialHeight = this.canvasContainer.height();

            const newCanvas = new Konva.Layer();
            const apiPromises: Promise<any>[] = [];

            this.route.queryParams.subscribe(params => {              
              let uploadedImagesLayer = new Konva.Layer();

              const firstPromise = this.appApiService.getFloorLayoutImages(this.eventId).then((response: any) => {
                if (response === null || response === '' || response.length === 0) return;

                response.forEach((obj: any) => {
                  const imageObjects = obj.imageObj;
                  const imageBase64 = obj.imageBase64;
                  const imageType = obj.imageType;
                  const imageScale = obj.imageScale;
                  const imageID = obj._id;

                  if (imageObjects && imageBase64) {
                    uploadedImagesLayer = Konva.Node.create(JSON.parse(imageObjects), 'next-container');
                    
                    const group = new Konva.Group(uploadedImagesLayer.getAttrs());
                    group.setAttrs({
                      x: uploadedImagesLayer.getAttr('x') ? uploadedImagesLayer.getAttr('x') : 0,
                      y: uploadedImagesLayer.getAttr('y') ? uploadedImagesLayer.getAttr('y') : 0,
                      draggable: true,
                      cursor: 'move',
                      databaseID: imageID,
                    });
                    
                    uploadedImagesLayer.children?.forEach(child => {
                      const image = new Konva.Image(child.getAttrs());
                      const img = new Image();
                      img.src = imageBase64;
                      image.setAttr('image', img);
                      image.setAttr('x', child.getAttr('x') ? child.getAttr('x') : 0);
                      image.setAttr('y', child.getAttr('y') ? child.getAttr('y') : 0);
                      image.setAttr('databaseID', imageID); //overwrite id to be the same as the id in the database

                      const uploadedImage: UploadedImage = {
                        id: image.getAttr('databaseID'),
                        type: imageType,
                        scale: imageScale,
                        base64: imageBase64
                      };
                      this.uploadedImages.push(uploadedImage);
                      this.existingFloorLayoutImages.push(uploadedImage);

                      group.add(image);
                      this.setMouseEvents(group);
                      const newDroppedItem = {
                        name: 'uploadedFloorplan',
                        konvaObject: group,
                      };
                      this.canvasItems.push(newDroppedItem);
                      newCanvas.add(group);
                    });
                  }
                });
                // this.reorderCanvasItems();
              });

              apiPromises.push(firstPromise);

              const secondPromise = this.appApiService.getEventFloorLayout(this.eventId).then((res: any) => {
                if (res === null || res === '') {
                  this.defaultBehaviour(newCanvas);
                  return;
                }
                
                const json = JSON.parse(res); // was JSON.parse(res.floorlayout)
                const width = this.canvasParent.nativeElement.offsetWidth;
                this.canvasContainer = new Konva.Stage({
                  container: '#canvasElement',
                  width: width*0.995, //was 0.9783
                  height: window.innerHeight-40,
                });
                this.canvas = Konva.Node.create(json, 'container'); 

                this.canvas.children?.forEach(child => {
                  let type : KonvaTypes;
                  let tooltip : Konva.Label;

                  switch (child.getClassName()) {
                    case 'Image':
                      type = new Konva.Image(child.getAttrs());
                      break;
                    case 'Path':
                      type = new Konva.Path(child.getAttrs());
                      this.currentPathStrokeWidth = 3;
                      type.setAttr('strokeWidth', this.currentPathStrokeWidth);
                      break;
                    case 'Circle':
                      type = new Konva.Circle(child.getAttrs());
                      tooltip = this.addTooltip(type, type.getAttr('x'), type.getAttr('y'));
                      this.tooltips.push(tooltip);
                      this.sensors?.push({object: type, isLinked: type.getAttr('fill') === 'red' ? false : true});
                      // this.store.dispatch(new AddSensor(type));                      
                      break;
                    case 'Group':
                      type = new Konva.Group(child.getAttrs());
                      if (type.hasName('stall')) {
                        this.addGroupChildren(type, child);
                      }
                      break;
                    case 'Text':
                      type = new Konva.Text(child.getAttrs());
                      break;
                    default:
                      type = new Konva.Line(child.getAttrs());
                      break;
                  }
                  newCanvas.add(type);
                  this.setMouseEvents(type);

                  this.canvasItems.push({name: child.getAttr('name'), konvaObject: type});
                });
              });

              apiPromises.push(secondPromise);

              Promise.all(apiPromises).then(() => {
                
                this.defaultBehaviour(newCanvas);
                this.moveSensorsAndTooltipsToTop();
                this.centerFloorPlan();
                this.reorderCanvasItems();
                if (this.canvasItems.length === 0) {
                  this.canvasContainer.x(0);
                  this.canvasContainer.y(0);
                }
              });
            
          });
          }, 6);
          
        setTimeout(() => {
          this.isLoading = false;
        }, 1500);
    }

    centerFloorPlan(): void {
      if (!this.canvas || !this.canvas.children) return;

      while(this.currentScale != 1) {
        this.zoomOut();
        if (this.currentScale < 1) {
          this.currentScale = 1;
          this.currentGridStrokeWidth = 1;
          this.currentPathStrokeWidth = 3;
          this.currentSensorCircleStrokeWidth = 1;
          this.currentLabelPointerHeight = 4;
          this.currentLabelPointerWidth = 4;
          this.currentLabelShadowBlur = 10;
          this.currentLabelShadowOffsetX = 10;
          this.currentLabelShadowOffsetY = 10;
          this.currentLabelFontSize = 10;

          // loop through all tooltips
          this.tooltips.forEach(tooltip => {
            const tag = tooltip.getChildren()[0];
            const text = tooltip.getChildren()[1];

            tag.setAttr('pointerWidth', this.currentLabelPointerWidth);
            tag.setAttr('pointerHeight', this.currentLabelPointerHeight);
            tag.setAttr('shadowBlur', this.currentLabelShadowBlur);
            tag.setAttr('shadowOffsetX', this.currentLabelShadowOffsetX);
            tag.setAttr('shadowOffsetY', this.currentLabelShadowOffsetY );

            text.setAttr('fontSize', this.currentLabelFontSize);
          });
        }
      }

      this.canvasContainer.setAttr('x', 0);
      this.canvasContainer.setAttr('y', 0);

      let maxXCoordinate = 0;
      let maxYCoordinate = 0;
      let minXCoordinate = 1000000;
      let minYCoordinate = 1000000;

      for (let i = 1; i < this.canvas.children.length; i++) {
        const child = this.canvas.children[i];
        if (child.attrs.x > maxXCoordinate) {
          maxXCoordinate = child.attrs.x;
        }
        if (child.attrs.y > maxYCoordinate) {
          maxYCoordinate = child.attrs.y;
        }
        if (child.attrs.x < minXCoordinate) {
          minXCoordinate = child.attrs.x;
        }
        if (child.attrs.y < minYCoordinate) {
          minYCoordinate = child.attrs.y;
        }
      }

      const floorplanCenterX = minXCoordinate + (maxXCoordinate - minXCoordinate) / 2;
      const floorplanCenterY = minYCoordinate + (maxYCoordinate - minYCoordinate) / 2;

      const originalCanvasCenterX = (this.canvasContainer.width() / 2) / 2;
      const originalCanvasCenterY = (this.canvasContainer.height() / 2) / 2;
      const originalCanvasX = this.canvasContainer.x();
      const originalCanvasY = this.canvasContainer.y();

      const newCanvasX = Math.abs(originalCanvasCenterX - floorplanCenterX);
      const newCanvasY = Math.abs(originalCanvasCenterY - floorplanCenterY);

      this.canvasContainer.setAttr('x', originalCanvasX - 2*newCanvasX);
      this.canvasContainer.setAttr('y', originalCanvasY - 2*newCanvasY);

      this.centerPosition = {x: originalCanvasX - 2*newCanvasX, y: originalCanvasY - 2*newCanvasY};

      this.canvasContainer.draw();
      this.canvasContainer.visible(true);
      this.centerDisabled = true;
    }

    moveSensorsAndTooltipsToTop(): void {
      this.sensors?.forEach(sensor => {
        sensor.object.moveToTop();
      });
      this.tooltips.forEach(tooltip => {
        tooltip.moveToTop();
      });
    }

    addGroupChildren(type: Konva.Group, child: Konva.Group | Shape<ShapeConfig>): void {
      type.children = (child as Konva.Group).children;
      type.children = type.children?.filter(child => child.getClassName() !== 'Image');
      Konva.Image.fromURL(this.STALL_IMAGE_URL, (img) => {
      const imgSrc = img.image();
      img = new Konva.Image({
        image: imgSrc,
      });
        img.setAttrs({
          x: 0,
          y: 0,
          width: this.componentSize,
          height: this.componentSize,
          cursor: 'move',
          draggable: true,
          cornerRadius: 2,
          padding: 20,
          fill: 'white',
          opacity: 1,
        });
        const oldText = type.getChildren().find(child => child instanceof Konva.Text) as Konva.Text;
        type.children = type.children?.filter(child => child.getClassName() !== 'Text');
        const newText = new Konva.Text({
          id: 'stallName',
          name: 'stallName',
          x: 0,
          y: 0,
          text: 'Stall-' + this.stallCount++,
          fontSize: 1.5,
          fontFamily: 'Calibri',
          fill: 'black',
          width: this.componentSize,
          height: this.componentSize,
          align: 'center',
          verticalAlign: 'middle',
          padding: 3,
          cursor: 'move',
        });
        
        newText.setAttr('text', oldText.getAttr('text'));
  
        (type as Konva.Group).add(img);
        (type as Konva.Group).add(newText);
  
        const tooltip = this.addTooltip(newText, type.getAttr('x'), type.getAttr('y'));
        this.tooltips.push(tooltip);
      });
    }

    defaultBehaviour(newCanvas: Konva.Layer): void {
      this.canvas = newCanvas;
      this.tooltips.forEach(tooltip => {
        this.canvas.add(tooltip);
      });
      this.canvasContainer.add(this.canvas);
      this.canvasContainer.draw();

      //set object moving
      this.canvas.on('dragmove', this.handleDragMove.bind(this));
      
      // Attach the mouse down event listener to start dragging lines
      this.canvasContainer.on('mousedown', this.onMouseDown.bind(this));
      
      this.createGridLines();
      
      this.canvasContainer.on('mouseup', this.onMouseUp.bind(this));
      
      // create selection box to select different components on the canvas
      this.createSelectionBox();

      this.canvasContainer.on('click', (e) => {
        const position = this.canvasContainer.getRelativePointerPosition();

        if (!position) return;
        
        const component = this.canvas.getIntersection(position);
        
        if (!component || !(component instanceof Konva.Line) && !(component instanceof Konva.Image) && !(component instanceof Konva.Group) && !(component instanceof Konva.Path)) {
          this.transformer.detach();
        }
        
        if (component && component instanceof Konva.Text) {
          const selectedText = component;
          const group = selectedText.getAncestors()[0] as Konva.Group;
          if (group) {
            this.activeItem = group;
            this.setTransformer(group, undefined);
          }
        }
        if (e.target.hasName('stallName')) {
          const parent = e.target.getParent() as KonvaTypes;

          if (!parent) return;

          this.activeItem = parent;
          this.setTransformer(parent, undefined);
        }
      });
      
      window.addEventListener('keydown', (event: KeyboardEvent) => {
        //now check if no input field has focus and the Delete key is pressed
        if (!this.inputHasFocus && (event.code === "Delete" || event.ctrlKey)) {
          this.handleKeyDown(event);
        }
      });
      window.addEventListener('keyup', (event: KeyboardEvent) => this.handleKeyUp(event));
      
      this.scaleBy = 2;
      
      // this.canvasContainer.on('wheel', (e) => {
      //   e.evt.preventDefault();
      //   this.handleScaleAndDrag(this.scaleBy, e);              
      // });
      
      this.canvasContainer.scaleX(this.scaleBy);
      this.canvasContainer.scaleY(this.scaleBy);
      // const wheelEvent = new WheelEvent('wheel', { deltaY: -1 });
      // this.canvasContainer.dispatchEvent(wheelEvent);
      // this.handleScaleAndDrag(this.scaleBy, wheelEvent);
      this.contentLoaded = true;
      this.snapLabel = this.TRUE_SCALE_FACTOR;
      this.gridSizeLabel = this.TRUE_SCALE_FACTOR;
    }
    
    handleScaleAndDrag(scaleBy:number, e?: any, direction?: 'in' | 'out'): void {
      let stage = null;
      if (e) {
        stage = e.target;
      }
      else {
        stage = this.canvasContainer;
      }
      if (!stage) return;
      const oldScale = stage.scaleX();

      let pointer = null;
      if (stage instanceof Konva.Stage) {
        pointer = stage.getPointerPosition();
      }
      else if (e){
        pointer = stage.getStage().getPointerPosition();
      }

      if (!pointer) {
        return;
      }

      // const mousePointTo = {
      //   x: pointer.x / oldScale - stage.x() / oldScale,
      //   y: pointer.y / oldScale - stage.y() / oldScale
      // };

      let wheelDirection = 0;
      if (!direction) {
        wheelDirection = e.evt.deltaY < 0 ? 1 : -1;
      }

      if (e?.evt.ctrlKey) {
        wheelDirection = -wheelDirection;
      }

      const newScale = (direction === 'in' || (!direction && wheelDirection > 0)) ? oldScale * scaleBy : oldScale / scaleBy;
      this.gridSize = this.initialGridSize * newScale;
      this.currentScale = newScale;

      if (newScale <= 1 || newScale >= 17) return;

      if (direction === 'in' || (!direction && wheelDirection > 0)) {
        if (this.contentLoaded) {
          this.wheelCounter++;
          this.scaleSnap = this.snaps[this.wheelCounter];
          this.displayedSnap = Math.round(this.scaleSnap * 100) / 100;
        }
        else {
          this.scaleSnap = this.initialSnap;
          this.displayedSnap = Math.round(this.scaleSnap * 100) / 100;
        }
        this.snapLabel = this.adjustValue(this.displayedSnap);

        this.updateStrokeWidths(0.5);
        if (newScale < 8) {
          this.maxReached = oldScale >= 8 ? true : false; 
          this.tooltipAllowedVisible = true;
          this.updateLabelSize(0.5, this.maxReached);
        }
        else {
          this.maxReached = true;
          this.tooltipAllowedVisible = false;
          this.setAllTootipsVisibility(false);
          this.updateLabelSize(0.5, this.maxReached);
        }
        this.setZoomInDisabled(this.displayedSnap);
        this.setZoomOutDisabled(this.displayedSnap);
      }
      else {
        if (this.contentLoaded) {
          this.wheelCounter--;
          this.scaleSnap = this.snaps[this.wheelCounter];
          this.displayedSnap = Math.round(this.scaleSnap * 100) / 100;
        }
        else {
          this.scaleSnap = this.initialSnap;
          this.displayedSnap = Math.round(this.scaleSnap * 100) / 100;
        }
        this.snapLabel = this.adjustValue(this.displayedSnap);

        
        this.updateStrokeWidths(2);
        this.updateLabelSize(2, this.maxReached);
        if (newScale < 8) {
          this.maxReached = oldScale >= 8 ? true : false;
          this.tooltipAllowedVisible = true;
          this.maxReached = false;
        }
        else {
          this.tooltipAllowedVisible = false;
          this.setAllTootipsVisibility(false);
        }
        this.setZoomInDisabled(this.displayedSnap);
        this.setZoomOutDisabled(this.displayedSnap);
      }

      
      const clampedScaleX = Math.min(Math.max(newScale, 1), 16);
      const clampedScaleY = Math.min(Math.max(newScale, 1), 16);

      const oldScaleX = this.canvasContainer.scaleX();
      const oldScaleY = this.canvasContainer.scaleY();
      // Get the center of the viewport as the zoom center
      const zoomCenterX = this.canvasContainer.width() / 2;
      const zoomCenterY = this.canvasContainer.height() / 2;
  
      // Calculate new position for zoom center
      const newPosX = zoomCenterX - (zoomCenterX - this.canvasContainer.x()) * (clampedScaleX / oldScaleX);
      const newPosY = zoomCenterY - (zoomCenterY - this.canvasContainer.y()) * (clampedScaleY / oldScaleY);
  
      this.canvasContainer.x(newPosX);
      this.canvasContainer.y(newPosY);
      this.canvasContainer.scaleX(clampedScaleX);
      this.canvasContainer.scaleY(clampedScaleY);

      const pos = this.boundFunc({ x: newPosX, y: newPosY }, newScale);
      this.canvasContainer.position(pos);
    }

    updateStrokeWidths(scale: number) {
      if (this.gridLines && this.gridLines.children) {
        this.gridLines.children?.forEach((child: any) => {
          const prevWidth = child.getAttr('strokeWidth');
          child.strokeWidth(prevWidth * scale);
          this.currentGridStrokeWidth = prevWidth * scale;
        });

        if (this.canvas && this.canvas.children) {
          this.canvas.children?.forEach((child: any) => {
            if (child instanceof Konva.Path) {
              const prevWidth = child.getAttr('strokeWidth');
              child.strokeWidth(prevWidth * scale);
              this.currentPathStrokeWidth = prevWidth * scale;
            }
            if (child instanceof Konva.Circle) {
              const prevWidth = child.getAttr('strokeWidth');
              child.strokeWidth(prevWidth * scale);
              this.currentSensorCircleStrokeWidth = prevWidth * scale;
            }
          });
        }
      }
    }

    updateLabelSize(scale: number, maxWasReached: boolean) {
      this.tooltips.forEach((tooltip: any) => {
        tooltip.children?.forEach((child: any) => {
          if (child instanceof Konva.Text) {
            const prevSize = child.getAttr('fontSize');
            child.fontSize(prevSize * scale);
            this.currentLabelFontSize = prevSize * scale;
          }
          else if (child instanceof Konva.Tag) {
            const prevPointerWidth = child.getAttr('pointerWidth');
            const prevPointerHeight = child.getAttr('pointerHeight');
            const prevShadowBlur = child.getAttr('shadowBlur');
            const prevShadowOffsetX = child.getAttr('shadowOffsetX');
            const prevShadowOffsetY = child.getAttr('shadowOffsetY');
            
              child.pointerWidth(prevPointerWidth * scale);
              child.pointerHeight(prevPointerHeight * scale);
              child.shadowBlur(prevShadowBlur * scale);
              child.shadowOffsetX(prevShadowOffsetX * scale);
              child.shadowOffsetY(prevShadowOffsetY * scale);
            

            this.currentLabelPointerWidth = prevPointerWidth * scale;
            this.currentLabelPointerHeight = prevPointerHeight * scale;
            this.currentLabelShadowBlur = prevShadowBlur * scale;
            this.currentLabelShadowOffsetX = prevShadowOffsetX * scale;
            this.currentLabelShadowOffsetY = prevShadowOffsetY * scale;
          }
        });
      });
    }

    boundFunc(pos: any, scale: any) {
      const stageWidth = this.canvasContainer.width();
      const stageHeight = this.canvasContainer.height();
  
      const x = Math.min(0, Math.max(pos.x, stageWidth * (1 - scale)));
      const y = Math.min(0, Math.max(pos.y, stageHeight * (1 - scale)));
  
      if (this.canvasContainer.position().x != this.centerPosition.x || 
        this.canvasContainer.position().y != this.centerPosition.y) {
          this.centerDisabled = false;
      }

      return {
        x,
        y
      };
    }

    handleDragMove(e: any) {
      if (this.ctrlDown) {
        this.canvasContainer.position({
          x: e.target.x(),
          y: e.target.y()
        });
      }
    }

    handleKeyDown(event: KeyboardEvent): void {
      this.ctrlDown = false;
      event.preventDefault();

      if (this.activeItem) {
        if (event.code === "Delete") {
          this.removeObject(this.activeItem);
          this.canvas.batchDraw();
        }
      }
      else if (this.activePath) {
        if (event.code === "Delete") {
          this.removeObject(this.activePath);
          this.canvas.batchDraw();
        }
      }
      else if (event.ctrlKey && this.canvasItems.length !== 0) {
        this.ctrlDown = true;
        document.body.style.cursor = 'grab';
        if (this.mouseDown) {
          document.body.style.cursor = 'grabbing';
        }

        this.canvasContainer.draggable(true);   
        
        this.canvasContainer.dragBoundFunc((pos) => {          
          return this.boundFunc(pos, this.canvasContainer.scaleX());
        });
      }
    }

    handleKeyUp(event: KeyboardEvent): void {
      this.ctrlDown = false;
      this.canvasContainer.draggable(false);
      document.body.style.cursor = 'default';
      event.preventDefault();
    }

    setTransformer(mouseEvent?: KonvaTypes | undefined, line?: Konva.Line | Konva.Path): void {
      if(!this.preventCreatingWalls) return;

      this.transformer.detach();

      if (this.selectedTextBox) {
        this.transformer = new Konva.Transformer({
          enabledAnchors: [],
          rotateEnabled: true,
        });
      }
      else if (this.selectedWall) {
        this.transformer = new Konva.Transformer({
          enabledAnchors: ['middle-left', 'middle-right'],
          rotateEnabled: true,
        });
        this.activeItem.on('dragmove click dblclick', () => {
          const newWidth = this.revertValue(this.getActiveItemWidth());
          const newPathData = `M0,0 L${newWidth},0`;
          this.activeItem?.setAttr('data', newPathData);
          this.activeItem?.setAttr('rotation', this.activeItem?.getAttr('angle'));
          this.transformer.rotation(this.activeItem?.getAttr('angle'));
          this.transformer.update();
        });
        this.transformer.on('transform', () => {
          const pointer = this.canvasContainer.getPointerPosition();
          const object = this.updateData(this.activeItem, pointer);
          const data = object['newData'];
          const startPointX = object['startPointX'];
          const startPointY = object['startPointY'];
          const endPointX = object['endPointX'];
          const endPointY = object['endPointY'];
          this.activeItem?.setAttr('data', data);
          const newWidth = this.calculateWidth(this.activeItem);
          const newAngle = this.calculatePathAngle(this.activeItem);
          this.activeItem?.setAttr('width', newWidth);
        });
      }
      else if (this.activeItem instanceof Konva.Circle) {
        this.transformer = new Konva.Transformer({
          enabledAnchors: [],
          rotateEnabled: false,
          borderStroke: 'blue',
          borderStrokeWidth: 1,
        });
      }
      else if (this.activeItem instanceof Konva.Group) {
        if (!this.activeItem.hasName('uploadedFloorplan')) {
          this.transformer = new Konva.Transformer({
            nodes: [this.activeItem],
            rotateEnabled: true,
            enabledAnchors: [],
            keepRatio: false,
            boundBoxFunc: (oldBox, newBox) => {
              return newBox;
            }
          });
        }
        else {
          this.transformer = new Konva.Transformer({
            nodes: [this.activeItem],
            rotateEnabled: true,
            enabledAnchors: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
            keepRatio: true,
            boundBoxFunc: (oldBox, newBox) => {
              return newBox;
            }
          });
        }
        this.transformer.on('transform', () => {
          const newAngle = this.transformer.getAbsoluteRotation();
          this.activeItem?.setAttr('rotation', newAngle);
        });
      }

      this.canvas.add(this.transformer);
      let target = null;
      if (mouseEvent) {
        target = mouseEvent;
      }
      else if (line) {
        target = line;
      }

      const node = target as Konva.Node;
      this.transformer.nodes([node]);
    }

    createSelectionBox(): void {
      if (this.ctrlDown) {
        return;
      }

      this.transformer = new Konva.Transformer({
        enabledAnchors: [],
        resizeEnabled: false,
      });
      this.transformers.push(this.transformer);
      this.canvas.add(this.transformer);

      const selectionBox = new Konva.Rect({
        fill: 'rgba(0,0,255,0.2)',
        visible: false,
        name: 'selectionBox'
      });

      const rect = new Konva.Rect({
        fill: 'rgba(0,0,0,0)',
        visible: false,
        draggable: false,
        cursor: 'move',
        name: 'rectOverlay',
      })

      this.canvas.add(selectionBox);
      this.canvas.add(rect);

      let x1: number;
      let y1: number;
      let x2: number;
      let y2: number;

      this.canvasContainer.on('mousedown', (e) => {
        if (this.ctrlDown) {
          return;
        }
        
        if (!this.preventCreatingWalls) {
          this.activeItem = null;
          this.textLength = 0;
          this.selectedTextBox = false;

          // this.store.dispatch(new UpdateActiveSensor(''));
  
          return;
        }

        // do nothing if we mousedown on any shape
        if (e.target !== this.canvasContainer) {
          return;
        }

        e.evt.preventDefault();
        const points = this.canvasContainer.getPointerPosition();
        x1 = points ? (points.x - this.canvasContainer.x()) / this.canvasContainer.scaleX() : 0;
        y1 = points ? (points.y - this.canvasContainer.y()) / this.canvasContainer.scaleY() : 0;
        x2 = points ? (points.x - this.canvasContainer.x()) / this.canvasContainer.scaleX() : 0;
        y2 = points ? (points.y - this.canvasContainer.y()) / this.canvasContainer.scaleY() : 0;

        selectionBox.visible(true);
        selectionBox.width(0);
        selectionBox.height(0);
        rect.visible(true);
        rect.width(0);
        rect.height(0);
      });

      this.canvasContainer.on('mousemove', (e) => {
        if (!this.preventCreatingWalls) {
          return;
        }
        
        // do nothing if we didn't start selection
        if (!selectionBox.visible()) {
          return;
        }
        e.evt.preventDefault();

        const points = this.canvasContainer.getPointerPosition();
        x2 = points ? (points.x - this.canvasContainer.x()) / this.canvasContainer.scaleX() : 0;
        y2 = points ? (points.y - this.canvasContainer.y()) / this.canvasContainer.scaleY() : 0;

        selectionBox.setAttrs({
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        });
      });

      this.canvasContainer.on('mouseup', (e) => {
        if (!this.preventCreatingWalls) {
          return;
        }
        
        // do nothing if we didn't start selection
        if (!selectionBox.visible()) {
          return;
        }
        e.evt.preventDefault();
        
        // update visibility in timeout, so we can check it in click event
        setTimeout(() => {
          selectionBox.visible(false);
        });

        //find any this related to lines and images and text
        const shapes = this.canvasContainer.find('.rect, .wall, .sensor, .stall, .stallName, .textBox');
        const box = selectionBox.getClientRect();
        this.selected = shapes.filter((shape) => {
          return Konva.Util.haveIntersection(box, shape.getClientRect());
        }) as Konva.Shape[];
        
        //remove all previous selections
        this.transformers.forEach((tr) => {
          tr.nodes([]);
        });

        //add new selections
        if (this.selected.length) {
          // this.transformers.forEach((tr) => {
          //   tr.nodes(selected);
          // });
          // find the min and max x and y values among the selected shapes
          this.madeSelection(rect, this.selected, this.transformer);
        }

        if (this.transformer.nodes().length === 1) {
          this.activeItem = this.transformer.nodes()[0];

          if (this.activeItem instanceof Konva.Circle) {
            // this.store.dispatch(new UpdateActiveSensor(this.activeItem.getAttr('customId')));
          }
        }
      });

      // clicks should select/deselect shapes
      this.canvasContainer.on('click', (e) => {
        if (!this.preventCreatingWalls) {
          return;
        }
        
        // if click on empty area - remove all selections
        if (e.target === this.canvasContainer) {
          this.transformers.forEach((tr) => {
            this.transformer.nodes([]);
          });
          this.activeItem = null;
          this.transformer.nodes([]);
          this.transformer.nodes([]);
          this.textLength = 0;
          this.selectedTextBox = false;

          // this.store.dispatch(new UpdateActiveSensor(''));

          if (this.selectionGroup) {
            this.updatePositions();
            this.selected.forEach((shape) => {
              if (shape.hasName('textBox') ||  shape.hasName('stall') || shape.hasName('sensor') || shape.hasName('wall')) {
                shape.moveTo(this.canvas);
                shape.draggable(true);
              }
            });
            this.selectionGroup.remove();
          }
          return;
        }

        if (this.transformer.nodes().length > 1){
          this.activeItem = null;
          this.textLength = 0;
          this.selectedTextBox = false;

          // this.store.dispatch(new UpdateActiveSensor(''));
        }

        // if we are selecting with rect, do nothing
        if (selectionBox.visible()) {
          return;
        }

        // do nothing if clicked NOT on our lines or images or text
        if (
          !e.target.hasName('rect') && 
          // !e.target.hasName('wall') && 
          !e.target.hasName('sensor') && 
          !e.target.hasName('stall') && 
          // !e.target.hasName('stallName') && 
          !e.target.hasName('textBox') && e.target === this.canvasContainer) {
          this.activeItem = null;
          this.textLength = 0;
          this.selectedTextBox = false;
          this.transformer.detach();
          this.transformer.nodes([]);
          // this.tr.detach();
          this.transformer.nodes([]);
          // this.transformers = [];

          // this.store.dispatch(new UpdateActiveSensor(''));
          
          if (e.target.hasName('stallName')) {
            // find parent
            const parent = e.target.getParent();

            if (!parent) return;

            this.activeItem = parent;
            this.transformer.nodes([parent]);
            this.transformer.nodes([parent]);
            this.transformers = [this.transformer];
            this.canvas.draw();
          }
          else if (e.target.hasName('wall')) {
            this.activeItem = e.target;
            // this.setTransformer(undefined, this.activeItem);
            this.canvas.draw();
          }
          return;
        }

        if (e.target instanceof Konva.Line) {
          this.activeItem = null;
          this.textLength = 0;
          this.selectedTextBox = false;
          this.transformer.detach();
          this.transformer.nodes([]);
          // tr.detach();
          this.transformer.nodes([]);
          // this.transformers = [];
          return;
        }

        // check to see if we pressed ctrl or shift
        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = this.transformer.nodes().indexOf(e.target) >= 0;

        if (!metaPressed && !isSelected) {
          // if no key pressed and the node is not selected
          // select just one
          this.transformer.nodes([e.target]);
        } else if (metaPressed && isSelected) {
          // if we pressed keys and node was selected
          // we need to remove it from selection:
          const nodes = this.transformer.nodes().slice(); // use slice to have new copy of array
          // remove node from array
          nodes.splice(nodes.indexOf(e.target), 1);
          this.transformer.nodes(nodes);

          if (this.transformer.nodes().length > 1){
            this.activeItem = null;
            this.textLength = 0;
            this.selectedTextBox = false;

            // this.store.dispatch(new UpdateActiveSensor(''));
            
          } else if (this.transformer.nodes().length === 1) {
            this.activeItem = this.transformer.nodes()[0];

            if (this.activeItem instanceof Konva.Circle) {
              // this.store.dispatch(new UpdateActiveSensor(this.activeItem.getAttr('customId')));
            }
          }

        } else if (metaPressed && !isSelected) {
          // add the node into selection
          const nodes = this.transformer.nodes().concat([e.target]);
          this.transformer.nodes(nodes);

          if (this.transformer.nodes().length > 1){
            this.activeItem = null;
            this.textLength = 0;
            this.selectedTextBox = false;

            // this.store.dispatch(new UpdateActiveSensor(''));
            
          }
        }
      });
    }

    updatePositions() {
      if (this.prevSelectionGroup) {
        this.selected.forEach((shape) => {
          if (shape.hasName('textBox') ||  shape.hasName('stall') || shape.hasName('sensor') || shape.hasName('wall')) {
            shape.x(shape.x() + this.prevSelectionGroup.x());
            shape.y(shape.y() + this.prevSelectionGroup.y());
            this.updateTooltipID(shape as KonvaTypes);
          }
        });
        this.canvas.draw();
      }
      return;
    }

    madeSelection(rect: Konva.Rect, selected: Konva.Shape[], tr: Konva.Transformer) {
      let minX = selected[0].x();
      let maxX = selected[0].x() + selected[0].width();
      let minY = selected[0].y();
      let maxY = selected[0].y() + selected[0].height();

      // test if selected contain a path object
      const containsPath = selected.some((shape) => {
        return shape instanceof Konva.Path;
      });

      if (!this.prevSelections) {
        this.prevSelections = selected;
      }
      else {
        // check if there is a shape that is in the previous selection but not in the current selection
        selected.forEach((shape) => {
          if (!this.prevSelections.includes(shape)) {
            this.prevSelections = [];
            this.emptiedSelection = true;
            return;
          }
        });
      }

      selected.forEach((shape) => {
        if (shape.hasName('textBox') ||  shape.hasName('stall') || shape.hasName('sensor') || shape.hasName('wall')) {
          if (this.emptiedSelection) this.prevSelections.push(shape);
          minX = Math.min(minX, shape.x());
          maxX = containsPath ? Math.max(maxX, shape.x()) : Math.max(maxX, shape.x() + shape.width());
          minY = Math.min(minY, shape.y());
          maxY = containsPath ? Math.max(maxY, shape.y()) : Math.max(maxY, shape.y() + shape.height());
        }
      });

      this.selectionGroup = new Konva.Group({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        draggable: true,
        name: 'selectionGroup',
        cursor: 'move',
      });

      this.prevSelectionGroup = this.selectionGroup;
      
      // set the position and size of the box
      rect.position({ x: 0, y: 0 });
      rect.width(maxX - minX);
      rect.height(maxY - minY);
      rect.visible(true);

      this.selectionGroup.on('mouseenter', () => {
        document.body.style.cursor = 'move';
      });
      this.selectionGroup.on('mouseleave', () => {
        document.body.style.cursor = 'default';
      });
      this.selectionGroup.on('dragmove', () => {
        tr.nodes([this.selectionGroup]);
      });
      rect.on('click', () => {
        tr.nodes([this.selectionGroup]);
      });

      selected.forEach((shape) => {
        if (shape.hasName('textBox') ||  shape.hasName('stall') || shape.hasName('sensor') || shape.hasName('wall')) {
          shape.moveTo(this.selectionGroup);
          shape.draggable(false);
          shape.x(shape.x() - minX);
          shape.y(shape.y() - minY);
        }
      });
      rect.moveTo(this.selectionGroup);
      rect.draggable(false);
      tr.nodes([this.selectionGroup]);
      this.canvas.add(this.selectionGroup);
      this.canvas.draw();
    }

    onObjectMoving(event: Konva.KonvaEventObject<DragEvent>): void {
        // check if prev active item and new active item are same
        // if so do nothing
        if (this.activeItem != event.target) {
            //remove class from prev active item
            if (this.activeItem) {
                this.activeItem.setAttr('customClass', '');
                this.transformer.detach();
            }
            //set new active item
            this.activeItem = event.target;
            this.activeItem.setAttr('customClass', 'active');

            if (this.activeItem instanceof Konva.Circle) {
              // this.store.dispatch(new UpdateActiveSensor(this.activeItem.getAttr('customId')));
            }
        }

        const movedObject = event.currentTarget;
        const droppedItem = this.canvasItems.find(
            (item) => {
              return item.konvaObject === movedObject
            }
        );

        const isUploadedFloorplan = this.activeItem.getAttr('name')?.toString().includes('uploadedFloorplan') ? true : false;
        // set bounderies for the object such that the object cannot be move beyond the borders of the canvas
        
        
        if (droppedItem) {
            const canvasWidth = this.canvasElement.nativeElement.offsetWidth;
            const canvasHeight = this.canvasElement.nativeElement.offsetHeight;
            const objectWidth = movedObject.width() * movedObject.scaleX();
            const objectHeight = movedObject.height() * movedObject.scaleY();
            const positionX = movedObject.x() || 0;
            const positionY = movedObject.y() || 0;
        
            const gridSize = this.initialGridSize / this.currentScale;
            const minX = 0;
            const minY = 0;
            const maxX = canvasWidth - objectWidth;
            const maxY = canvasHeight - objectHeight;
        
            const snappedX = Math.round(positionX / gridSize) * gridSize;
            const snappedY = Math.round(positionY / gridSize) * gridSize;
        
            const limitedX = Math.max(minX, Math.min(maxX, snappedX));
            const limitedY = Math.max(minY, Math.min(maxY, snappedY));
        
            movedObject.setAttrs({
                x: limitedX,
                y: limitedY
            });
        
            if (positionX < minX) {
                movedObject.setAttr('x', minX);
            } else if (positionX > maxX) {
                movedObject.setAttr('x', maxX);
            }
        
            if (positionY < minY) {
                movedObject.setAttr('y', minY);
            } else if (positionY > maxY) {
                movedObject.setAttr('y', maxY);
            }
        
            // droppedItem.konvaObject?.setAttrs({
            //     draggable: false
            // });
            const element = droppedItem.konvaObject;
            if (element) this.updateTooltipID(element);
            this.canvas.batchDraw();
        
            this.openDustbin = true;

            // test if the cursor is on the dustbin
            const dustbinElement = this.dustbinElement.nativeElement;
            const boundingRect = dustbinElement.getBoundingClientRect();
            const mouseX = event.evt.clientX;
            const mouseY = event.evt.clientY;

            if (
                mouseX >= boundingRect.left &&
                mouseX <= boundingRect.right &&
                mouseY >= boundingRect.top &&
                mouseY <= boundingRect.bottom
            ) {
                this.onDustbin = true;
            }
            else {
                this.onDustbin = false;
            }
        }
    }          
    
    onDustbinDragOver(event: DragEvent): void {
        event.preventDefault();
        this.openDustbin = true;
        this.canvasContainer.container().style.cursor = 'copy';
      }
      
      onDustbinDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.openDustbin = false;
        this.onDustbin = false;
        this.canvasContainer.container().style.cursor = 'default';
      }
      
      onDustbinMouseUp(event: MouseEvent) {
        const dustbinElement = this.dustbinElement.nativeElement;
        const boundingRect = dustbinElement.getBoundingClientRect();
        const mouseX = event.clientX;
        const mouseY = event.clientY;
      
        if (
          mouseX >= boundingRect.left &&
          mouseX <= boundingRect.right &&
          mouseY >= boundingRect.top &&
          mouseY <= boundingRect.bottom
        ) {
            //find specific object with customClass attribute set to 'active'
            // const selectedObject = this.canvas.findOne((obj: any) => obj.getAttr('customClass') === 'active');
            let selectedObject: any = null;

            if (this.activeItem) {
                selectedObject = this.activeItem;
            }
            else {
                selectedObject = this.activePath;
            }
            
            if (selectedObject) {
              this.removeObject(selectedObject);
            }

        }
      }

      removeObject(selectedObject: KonvaTypes) {
        if (this.transformer) {
          this.canvas.find('Transformer').forEach((node) => node.remove());

          // add transformers to existing objects
          this.canvasItems.forEach((item) => {
            const transformer = new Konva.Transformer();
            this.canvas.add(transformer);
          });

        }

        // remove tooltip if the object is a stall or sensor
        if (selectedObject.hasName('stall') || selectedObject.hasName('sensor')) {
          this.tooltips.forEach((tooltip) => {
            if (selectedObject.hasName('stall')) {
              const stallText = (selectedObject as Konva.Group).children?.find((child) => child instanceof Konva.Text)?.getAttr('text');
              if (tooltip.getAttr('id').includes(stallText)) {
                tooltip.destroy();
                this.tooltips.splice(this.tooltips.indexOf(tooltip), 1);
              }
            }
            else if (selectedObject.hasName('sensor')) {
              const sensorID = (selectedObject as Konva.Circle).getAttr('customId');
              if (tooltip.getAttr('id').includes(sensorID)) {
                tooltip.destroy();
                this.tooltips.splice(this.tooltips.indexOf(tooltip), 1);
              }
            }
          });
        }

        if (selectedObject.hasName('uploadedFloorplan')) {
          const imageID = (selectedObject as Konva.Group).getChildren()[0].getAttr('databaseID');

          this.uploadedImages.forEach((image) => {
            if (image.id === imageID) {
              this.uploadedImages.splice(this.uploadedImages.indexOf(image), 1);
              this.existingFloorLayoutImages.splice(this.existingFloorLayoutImages.indexOf(image), 1);

              // remove image from database
              this.appApiService.getEmail().then((email) => {
                this.appApiService.removeFloorplanImage(email, this.eventId, imageID).then((res) => {
                  console.log(res);
                });
              });
            }
          });
        }

      
        document.body.style.cursor = 'default';
        this.removeMouseEvents(selectedObject);
        selectedObject.remove();
        this.openDustbin = false;
        this.onDustbin = false;
        this.activeItem = null;
        this.textLength = 0;
        this.selectedTextBox = false;

        // this.store.dispatch(new UpdateActiveSensor(''));

        // remove item from canvasItems array
        const index = this.canvasItems.findIndex((item) => item.konvaObject === selectedObject);
        if (index > -1) {
            this.canvasItems.splice(index, 1);
            
            // check is there exists a sensor, stall, wall, text box, or uploaded floorplan
            const stall = this.canvasItems.some((item) => item.konvaObject?.hasName('stall'));
            const sensor = this.canvasItems.some((item) => item.konvaObject?.hasName('sensor'));
            const wall = this.canvasItems.some((item) => item.konvaObject?.hasName('wall'));
            const textBox = this.canvasItems.some((item) => item.konvaObject?.hasName('textBox'));
            const uploadedFloorplan = this.canvasItems.some((item) => item.konvaObject?.hasName('uploadedFloorplan'));
            if (!stall && !sensor && !wall && !textBox && !uploadedFloorplan) {
              this.canvasItems = [];
            }
        }
        this.canvas.batchDraw();
      }
      
      onDustbinDrop(event: Konva.KonvaEventObject<DragEvent>): void {
        const selectedObject = this.canvas.findOne('.active');
        if (selectedObject) {
          selectedObject.remove();
          this.canvas.batchDraw();
        }
        // Snap any moving object to the grid
        const gridSize = this.gridSize; // Adjust this value according to your needs
        const target = event.target;
        if (target) {
          const position = target.position();
          const left = position.x || 0;
          const top = position.y || 0;
          target.position({
            x: Math.round(left / gridSize) * gridSize,
            y: Math.round(top / gridSize) * gridSize,
          });
        }
      }
      
      onMouseDown(event: Konva.KonvaEventObject<MouseEvent>): void {
        this.mouseDown = true;
        if (this.ctrlDown) {
          return;
        }

        const target = event.target;
        if (target && target instanceof Konva.Line
          || target instanceof Konva.Path
          || target instanceof Konva.Image
          || target instanceof Konva.Group) {
            // Clicking on a line or path or image or group will not do anything
            return;
        } else if (this.preventCreatingWalls) {
          return;
        }
        else this.transformer.detach();
        
        const pointer = this.canvasContainer.getPointerPosition();
        const grid = this.scaleSnap;
        const xValue = pointer ? this.convertX(pointer.x) : 0;
        const yValue = pointer ? this.convertY(pointer.y) : 0;
        const snapPoint = {
            x: Math.round(xValue / grid) * grid,
            y: Math.round(yValue / grid) * grid,
        };

        // test if there already exists a wall
        const wall = this.canvas.findOne('.wall');
        if (wall) {
          this.currentPathStrokeWidth = wall.getAttr('strokeWidth');
        }
        else if (this.currentScale !== 1){
          this.currentPathStrokeWidth = this.currentGridStrokeWidth * 3;
        }
        else {
          this.currentPathStrokeWidth = 3;
        }
        
        const path = new Konva.Path({
            x: snapPoint.x,
            y: snapPoint.y,
            data: 'M0,0 L0,0',
            stroke: 'black',
            strokeWidth: this.currentPathStrokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,
            name: 'wall'
        });

        this.activePath = path;
        path.on('dragmove', this.onObjectMoving.bind(this));
        this.canvas.add(path);
        this.canvas.batchDraw();
        this.reorderCanvasItems();

        this.paths.push(path);
        this.isDraggingLine = true;

        // Attach the mouse move event listener
        this.canvasContainer.on('mousemove', this.onMouseMove.bind(this));

        // Attach the mouse up event listener
        this.canvasContainer.on('mouseup', this.onMouseUp.bind(this));
      }

      calculatePathAngle(path: Konva.Path): number {
        const pointer = this.canvasContainer.getPointerPosition();
        if (path) {
          const object = this.updateData(path, pointer);
          const startPointX = object['startPointX'];
          const startPointY = object['startPointY'];
          const endPointX = object['endPointX'];
          const endPointY = object['endPointY'];
          const angle = Math.atan2(endPointY - startPointY, endPointX - startPointX) * 180 / Math.PI;
          this.activePathStartPoint = {
            x: startPointX,
            y: startPointY
          };
          this.activePathEndPoint = {
            x: endPointX,
            y: endPointY
          };
          return angle;
        }
        return 0;
      }

      calculateNewAngle(element: KonvaTypes): NumberSymbol {
        const angleRad = element.rotation();
        const angleDeg = angleRad * (180 / Math.PI);
        return angleDeg;
      }

      calculateWidth(element: Konva.Path): number {
        const data = element.data();
        const startPointX = parseFloat(data.split(' ')[0].split(',')[0].replace('M', ''));
        const startPointY = parseFloat(data.split(' ')[0].split(',')[1]);
        const endPointX = parseFloat(data.split(' ')[1].split(',')[0].slice(1));
        const endPointY = parseFloat(data.split(' ')[1].split(',')[1]);
        const width = Math.sqrt(Math.pow(endPointX, 2) + Math.pow(endPointY, 2));
        return width;
      }

      updateData(element: Konva.Path, pointer: any) : {newData: string, snapPoint: {x: number, y: number}, endPointX: number, endPointY: number, startPointX: number, startPointY: number} {
        const grid = this.scaleSnap;
        const xValue = pointer ? this.convertX(pointer.x) : 0;
        const yValue = pointer ? this.convertY(pointer.y) : 0;
        const snapPoint = {
            x: Math.round(xValue / grid) * grid,
            y: Math.round(yValue / grid) * grid,
        };
        const data = element.data();
        const startPointX = data.split(' ')[0].split(',')[0].replace('M', '');
        const startPointY = data.split(' ')[0].split(',')[1];
        const endPointX = snapPoint.x - element.x();
        const endPointY = snapPoint.y - element.y();
        const newData = `M${startPointX},${startPointY} L${endPointX},${endPointY}`;
        return {'newData': newData, 'snapPoint': snapPoint, 'endPointX': endPointX, 'endPointY': endPointY, 'startPointX': parseFloat(startPointX), 'startPointY': parseFloat(startPointY)};
      }
      
      onMouseMove(): void {
        if (this.ctrlDown) {
          return;
        }

        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activePath) {
            const object = this.updateData(this.activePath, pointer);
            const newData = object['newData'];
            const endPointX = object['endPointX'];
            const endPointY = object['endPointY'];
            const startPointX = object['startPointX'];
            const startPointY = object['startPointY'];
            // this.activePath.setAttr('points', {'startPointX': startPointX, 'startPointY': startPointY, 'endPointX': endPointX, 'endPointY': endPointY});
            // console.log(this.activePath.getAttr('points'));
            const newWidth = Math.sqrt(Math.pow(endPointX, 2) + Math.pow(endPointY, 2));
            this.activePath.data(newData);
            const angle = this.calculatePathAngle(this.activePath);
            this.activePath.setAttr('angle', angle);
            this.activePath.setAttr('width', newWidth);
            this.canvas.batchDraw();
        }
      }
      
      onMouseUp(): void {
        this.openDustbin = false;
        this.mouseDown = false;

        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activePath) {
          const object = this.updateData(this.activePath, pointer);
          const newData = object['newData'];
          const snapPoint = object['snapPoint'];
          const endPointX = object['endPointX'];
          const endPointY = object['endPointY'];
          const newWidth = Math.sqrt(Math.pow(endPointX, 2) + Math.pow(endPointY, 2));
          this.activePath.data(newData);
          const angle = this.calculatePathAngle(this.activePath);
          this.activePath.setAttr('angle', angle);
          this.activePath.setAttr('width', newWidth);
          this.canvas.batchDraw();

          // test if the line is more than a certain length
          const length = Math.sqrt(Math.pow(endPointX, 2) + Math.pow(endPointY, 2));
          if (length < this.scaleSnap) {
              this.activePath.remove();
              this.transformer.detach();
              this.canvas.batchDraw();
              this.isDraggingLine = false;
              this.canvasContainer.off('mousemove');
              this.canvasContainer.off('mouseup');
              return;
          }

          //add line to canvasItems array
          this.canvasItems.push({
            name: 'wall',
            konvaObject: this.activePath,
          });
          this.removeDuplicates();
          this.removeFaultyPaths();
          this.resetCanvasItems();

          // set the height of the wall
          const height = Math.abs(snapPoint.y - this.activePath.y());
          this.activePath.setAttr('height', height); 

          // this.setMouseEvents(this.activeLine);
          this.activePath.setAttr('draggable', false);
          this.activePath.setAttr('opacity', 0.5);
          this.removeMouseEvents(this.activePath);

          this.setTransformer(undefined,this.activePath);

          this.activePath = null;             
        }

        this.isDraggingLine = false;
      
        // Remove the mouse move event listener
        this.canvasContainer.off('mousemove', this.onMouseMove.bind(this));
      
        // Remove the mouse up event listener
        this.canvasContainer.off('mouseup', this.onMouseUp.bind(this));
      }

      removeDuplicates() {
        //loop through canvasItems array and remove duplicates
        const unique: DroppedItem[] = [];
        this.canvasItems.forEach((item) => {
          if (item.konvaObject instanceof Konva.Group && !item.konvaObject?.hasChildren()) {
            item.konvaObject?.remove();
            this.canvasItems = this.canvasItems.filter((element) => element !== item);
          }         
          else if (!unique.includes(item)) {
            unique.push(item);
          }
        });
        this.canvasItems = unique;
      }

      removeFaultyPaths() {
        const faultyPaths = this.canvasItems.filter((item) => 
          item.konvaObject?.hasName('wall') &&
          item.konvaObject?.getAttr('data') === 'M0,0 L0,0'
        );
        faultyPaths.forEach((path) => {
          path.konvaObject?.remove();
          this.canvasItems = this.canvasItems.filter((item) => item !== path);
        });
        // remove them from canvasItems
        this.canvasItems = this.canvasItems.filter((item) =>
          !(item.konvaObject?.hasName('wall') &&
          item.konvaObject?.getAttr('data') === 'M0,0 L0,0')
        );
      }

      resetCanvasItems(): void {
        this.canvasItems = [];
        this.reorderCanvasItems();
      }
      
      createGridLines() {
        const grid = this.initialGridSize;
        const stage = this.canvasContainer;
        const width = stage.width();
        const height = stage.height();
        const gridGroup = new Konva.Group({
          x: stage.x(),
          y: stage.y(),
          width: width,
          height: height,
          bottom: stage.y() + height,
          right: stage.x() + width,
          draggable: false,
          name: 'gridGroup',
        });
        for (let i = 0; i < width / grid; i++) {
          const distance = i * grid;
          const horizontalLine = new Konva.Line({
            points: [distance, 0, distance, width],
            stroke: '#ccc',
            strokeWidth: 1,
            draggable: false,
            customClass: 'grid-line',
          });
          const verticalLine = new Konva.Line({
            points: [0, distance, width, distance],
            stroke: '#ccc',
            strokeWidth: 1,
            draggable: false,
            customClass: 'grid-line',
          });
          gridGroup.add(horizontalLine);
          gridGroup.add(verticalLine);
        }
        // get grid boundaries
        this.gridBoundaries = {
          x: gridGroup.x(),
          y: gridGroup.y(),
          width: gridGroup.width(),
          height: gridGroup.height(),
          bottom: gridGroup.y() + gridGroup.height(),
          right: gridGroup.x() + gridGroup.width(),
        };
        this.gridLines = gridGroup;

        this.canvas.add(gridGroup);
        gridGroup.moveToBottom();
        this.canvas.batchDraw();
      }  
      
      shouldStackVertically = false;

      // @HostListener('window:resize')
      // onWindowResize() {
      //   if (this.currentPage === '/event/createfloorplan') {
      //     this.checkScreenWidth();
      //   }
      // }
    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload($event: any) {
      this.isLoading = true;
    }

      // set the grid lines when the window is resized
    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.checkScreenWidth();
      // remove gridlines and then add them again
      // this.removeGridLines();
      const width = this.canvasParent.nativeElement.offsetWidth;

      this.canvasContainer.setAttrs({
        width: width*0.995,  //0.9783
        height: this.initialHeight,
      });
      // this.createGridLines();
    }

    removeGridLines(): void {
      const elementsToRemove: any[] = [];

      this.canvas?.children?.forEach((child: any) => {
        child.children?.forEach((grandChild: any) => {
          if (grandChild.attrs.customClass === 'grid-line') {
            elementsToRemove.push(grandChild);
          }
        });
      });

      elementsToRemove.forEach((element: any) => {
        element.remove();
      });
    }

    async hasAccess() : Promise<boolean> {
      const role = await this.appApiService.getRole();
  
      if (role === 'admin') {
        return new Promise((resolve) => {
          resolve(true);
        });
      }
  
      if (role === 'viewer') {
        return new Promise((resolve) => {
          resolve(false);
        });
      }
  
      const managed_events = await this.appApiService.getManagedEvents();
  
      for (let i = 0; i < managed_events.length; i++) {
        if ((managed_events[i] as any)._id === this.id) {
          return new Promise((resolve) => {
            resolve(true);
          });
        }
      }
  
      return new Promise((resolve) => {
        resolve(false);
      });
    }
    
      async ngOnInit() {
        this.id = this.route.parent?.snapshot.paramMap.get('id') || '';

        if (!this.id) {
          this.ngZone.run(() => { this.router.navigate(['/home']); });
        }

        this.event = (
          (await this.appApiService.getEvent({ eventId: this.id })) as any
        ).event;

        if (this.event === null) {
          this.ngZone.run(() => { this.router.navigate(['/home']); });
        }

        if (!(await this.hasAccess())) {
          this.ngZone.run(() => { this.router.navigate(['/home']); });
        }

        if (!(await this.hasAccess())) {
          this.ngZone.run(() => { this.router.navigate(['/home']); });
        }

        this.alertPresented = false;
        this.checkScreenWidth();

        this.router.events.subscribe((val) => {
          this.currentPage = this.router.url.split('?')[0];
    
          //check if url contains 'm=true'
          if (this.router.url.includes('m=')) {
            this.prevPage = this.currentPage === '/event/createfloorplan' ? '/event/eventdetails' : '/home';
          }
          else {
            this.prevPage = this.currentPage === '/event/createfloorplan' ? '/event/addevent' : '/home';
          }
            
            // this.store.dispatch(new SetSubPageNav(this.currentPage, this.prevPage));
        });
      }
    
      checkScreenWidth() {
        this.shouldStackVertically = window.innerWidth < 1421;
        this.isLargeScreen = window.innerWidth > 1421;
        this.screenTooSmall = window.innerWidth < 1152;

        if (this.screenTooSmall && !this.alertPresented) {
          this.showToast = false;
          this.uploadModalVisible = false;
          this.linkingMenuVisible = false;
          this.presentAlert();
        }
      }

      presentAlert(): void {
        const modal = document.querySelector('#small-screen-modal');

        modal?.classList.remove('hidden');
        setTimeout(() => {
          modal?.classList.remove('opacity-0');
        }, 100);
      }

      openLinkingMenu(): void {
        this.linkingMenuVisible = true;
        const modal = document.querySelector('#link-sensor-modal');

        modal?.classList.remove('hidden');
        setTimeout(() => {
          modal?.classList.remove('opacity-0');
        }, 100);
      }

      closeLinkingMenu(): void {
        this.linkingMenuVisible = false;
        this.activeItem = null;

        setTimeout(() => {
          this.linkingMenuVisible = true;
        }, 100);
      }

      closeToast(): void {
        this.showToast = false;

        setTimeout(() => {
          this.showToast = true;
        }, 100);
      }

      closeUploadModal(): void {
        this.uploadModalVisible = false;

        setTimeout(() => {
          this.uploadModalVisible = true;
        }, 100);
      }

      setUploadedImageType(type: string): void {
        this.uploadedImageType = type;
      }

      setUploadedImageScale(scale: number): void {
        this.uploadedImageScale = scale;
      }

      setUploadedImageBase64(base64: string): void {
        this.uploadedImageBase64 = base64;
      }

      onFloorplanUploaded(floorplan: Konva.Image): void {
        const newFloorplanImage = new Konva.Image({
          x: 0,
          y: 0,
          image: floorplan.image(),
          width: 100,
          height: 100,
          draggable: false,
          id: floorplan.id(),
        });

        const uploadedImage: UploadedImage = {
          id: floorplan.id(),
          type: this.uploadedImageType,
          scale: this.uploadedImageScale,
          base64: this.uploadedImageBase64
        };
        this.uploadedImages.push(uploadedImage);

        const newGroup = new Konva.Group({
          x: 0,
          y: 0,
          draggable: true,
          id: newFloorplanImage.id(),
          width: newFloorplanImage.width(),
          height: newFloorplanImage.height(),
          name: 'uploadedFloorplan',
        });

        newGroup.add(newFloorplanImage);

        this.setMouseEvents(newGroup);

        this.canvas.add(newGroup);
        const newDroppedItem = {
          name: 'uploadedFloorplan',
          konvaObject: newGroup,
        };
        this.canvasItems.push(newDroppedItem);
        this.moveSensorsAndTooltipsToTop();
        this.canvas.draw();
        this.reorderCanvasItems();
      }

      reorderCanvasItems() : void {
        //take the canvas layer and reorder the items such that the uploaded floorplan is at the bottom, stalls, walls and textboxes are one level above
        // and the sensors then one level above that and finally the tooltips are at the top
        
        let canvasItems = null;
        if (!this.canvas || !this.canvas.children) {
          this.canvas = this.canvasContainer.getLayers()[0];
          canvasItems = this.canvas.children;
        }
        else {
          canvasItems = this.canvas.children;
        }
        
        const newCanvas = new Konva.Layer();

        if (!canvasItems) return;

        const canvasItemsArray : DroppedItem[] = [];

        canvasItems.forEach((item: any) => {
          canvasItemsArray.push(item);
        });

        const gridGroup = canvasItemsArray.find((item: any) => {
          return item.attrs.name === 'gridGroup';
        });

        const uploadedFloorplan = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'uploadedFloorplan';
        });

        const stalls = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'stall';
        });

        const walls = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'wall';
        });

        const textboxes = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'textBox';
        });

        const sensors = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'sensor';
        });

        const tooltips = canvasItemsArray.filter((item: any) => {
          return item.getAttr('id').includes('tooltip');
        });

        const transformer = canvasItemsArray.filter((item: any) => {
          return item instanceof Konva.Transformer;
        });

        const selectionBox = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'selectionBox';
        });

        const rectOverlay = canvasItemsArray.filter((item: any) => {
          return item.attrs.name === 'rectOverlay';
        });

        const newCanvasItemsArray: DroppedItem[] = [];

        if (gridGroup) {
          newCanvasItemsArray.push(gridGroup);
        }

        uploadedFloorplan.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        walls.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        stalls.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        textboxes.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        sensors.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        tooltips.forEach((item: any) => {
          newCanvasItemsArray.push(item);
        });

        transformer.forEach((item) => {
          newCanvasItemsArray.push(item);
        });

        selectionBox.forEach((item) => {
          newCanvasItemsArray.push(item);
        });

        rectOverlay.forEach((item) => {
          newCanvasItemsArray.push(item);
        });

        this.canvasContainer.removeChildren();
        this.canvas.removeChildren();

        // add the items to the canvas
        newCanvasItemsArray.forEach((item: any) => {
          newCanvas.add(item);
        });

        this.canvas = newCanvas;
        this.canvasItems = [];
        this.canvas.children?.forEach((item: any) => {
          if (item.attrs.name === 'gridGroup' || item instanceof Konva.Transformer || item.attrs.name === 'selectionBox' || item.attrs.name === 'rectOverlay') {
            return;
          }
          const droppedItem = {
            name: item.attrs.name,
            konvaObject: item,
          };
          this.canvasItems.push(droppedItem);
        });
        this.canvasContainer.add(newCanvas);
        this.canvas.draw();
      }

      adjustJSONData(json: Record<string, any>): void {
        // adjust children's attributes
        json['children'].forEach((child: any) => {
          child.attrs.width = this.adjustValue(child.attrs.width);
          child.attrs.height = this.adjustValue(child.attrs.height);
          if (isNaN(child.attrs.height)) {
            child.attrs.height = 0;
          }
          if (isNaN(child.attrs.height)) {
            child.attrs.height = 0;
          }
        });
      }

      revertJSONData(json: Record<string, any>): void {
        // adjust children's attributes
        json['children'].forEach((child: any) => {
          child.attrs.width = this.revertValue(child.attrs.width);
          child.attrs.height = this.revertValue(child.attrs.height);
          if (isNaN(child.attrs.height)) {
            child.attrs.height = 0;
          }
          if (isNaN(child.attrs.height)) {
            child.attrs.height = 0;
          }
        });
      }

      async saveFloorLayout() {
        // remove grid lines from the JSON data
        const json = this.canvas?.toObject();

        const uploadedFloorplans = json?.children.filter((child: any) => {
          return child.attrs.name === 'uploadedFloorplan';
        });

        // remove the grid lines, transformers and groups from the JSON data
        json.children = json.children.filter((child: KonvaTypes) => {
          if (child.attrs.name === 'wall' || child.attrs.name === 'stall' || child.attrs.name === 'sensor' || child.attrs.name === 'textBox' || child.attrs.name === 'uploadedFloorplan') {
            child.attrs.opacity = 1;
          }
          return child.attrs.name === 'wall' || child.attrs.name === 'stall' || child.attrs.name === 'sensor' || child.attrs.name === 'textBox' || child.attrs.name === 'uploadedFloorplan';
        });
        
        const adjustedJson = JSON.parse(JSON.stringify(json));
        this.adjustJSONData(adjustedJson);

        // const revertedJson = JSON.parse(JSON.stringify(adjustedJson));       this will be moved to the loadFlootLayout() function
        // this.revertJSONData(revertedJson);

        //stringify the JSON data
        const jsonString = JSON.stringify(json);
        const adjustedJsonString = JSON.stringify(adjustedJson);

        this.showToastUploading = true;

        // update the existing images in the database
        uploadedFloorplans?.forEach((floorplan: any) => {
          this.existingFloorLayoutImages?.forEach((image: UploadedImage) => {
            if (floorplan.attrs.databaseID === image.id) {
              const imageType = image.type;
              const imageScale = image.scale;
              const imageBase64 = image.base64;
              const imageObj = JSON.stringify(floorplan);
              
              this.appApiService.getEmail().then((email) => {
                this.appApiService.updateFloorplanImages(this.eventId, image.id, email, imageBase64, imageObj, imageScale, imageType).then((res: any) => {
                  console.log(res);
                });
              });
            }
          });

          this.uploadedImages.forEach((image) => {
            const imageType = image.type;
            const imageScale = image.scale;
            const imageBase64 = image.base64;
            const imageObj = JSON.stringify(floorplan);
            if (!this.existingFloorLayoutImages.includes(image) && floorplan.attrs.id === image.id) {
              this.appApiService.addNewFloorplanImages(this.eventId, imageBase64, imageObj, imageScale, imageType).then((res: any) => {
                console.log(res);
              });
            }
          });
        });

        // save the JSON data to the database
        this.appApiService.updateFloorLayout(this.eventId, jsonString).then((res: any) => {
          console.log(res);

          setTimeout(() => {
            this.showToastUploading = false;
            res ? this.showToastSuccess = true : this.showToastError = true; 

            setTimeout(() => {
              this.showToastSuccess = false;
              this.showToastError = false;
              if (res) this.ngZone.run(() => { this.router.navigate(['details'], { relativeTo: this.route.parent }); });
            }, 1000)
          }, 2000);
        });        
      }

    async presentToastSuccess(position: 'top' | 'middle' | 'bottom', message: string) {
      // const toast = await this.toastController.create({
      //   message: message,
      //   duration: 2500,
      //   position: position,
      //   color: 'success',
      // });
  
      // await toast.present();
    }

      downloadURI(uri: string, name: string) {
        const link = document.createElement('a');
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      updateWidth(event: any) {
        const input = this.revertValue(parseFloat(event.target.value));
        if (this.activeItem instanceof Konva.Path) {
          const newPathData = `M0,0 L${input},0`;
          this.activeItem?.setAttr('data', newPathData);
        }
        this.activeItem?.width(input);
        this.canvas.batchDraw();
      }
    
      updateHeight(event: any) {
        const input = this.revertValue(parseInt(event.target.value));
        if (this.activeItem instanceof Konva.Path) {
          const newPathData = `M0,0 L0,${input}`;
          this.activeItem?.setAttr('data', newPathData);
        }
        this.activeItem?.width(input);
        this.canvas.batchDraw();
      }

      updateText(event: any) {
        const input = event.target.value;
        const isStall = (this.activeItem instanceof Konva.Group && this.activeItem?.hasName('stall'));
        const isOnlyText = (this.activeItem instanceof Konva.Text && this.activeItem?.hasName('textBox'));
        if (isOnlyText || isStall) {
          const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
          if (!alphanumericRegex.test(input)) {
            // Remove non-alphanumeric characters, excluding white spaces
            const alphanumericInput = input.replace(/[^a-zA-Z0-9 ]/g, '');
            this.textInputField.nativeElement.value = alphanumericInput;
            return;
          }

          if (isOnlyText) {
            this.activeItem?.text(input);
          }
          else {
            // find child text of group
            const text = this.activeItem?.children.find((child: any) => {
              return child instanceof Konva.Text;
            });
            text?.text(input);
            this.updateTooltipID(text);
          }
          this.textLength = input.length;
        }
        this.canvas.batchDraw();
      }      

      updateRotation(event: any) {
        const input = parseFloat(event.target.value);
        if (input < 0) {
          this.activeItem?.rotation(360 + input);
        }
        else {
          this.activeItem?.rotation(input);
        }
      }

      getActiveItemWidth(): number {
        if (this.activeItem instanceof Konva.Path) {
          const width = this.calculateWidth(this.activeItem);
          return this.adjustValue(width);
        }
        else {
          return this.adjustValue(Math.round(this.activeItem?.width() * this.activeItem?.scaleX() * 10000) / 10000) ;
        }
      }

      getActiveItemHeight(): number {
        return this.adjustValue(Math.round(this.activeItem?.height() * this.activeItem?.scaleY() * 100) / 100);
      }

      getActiveItemText(): string {
        const isStall = (this.activeItem instanceof Konva.Group && this.activeItem?.hasName('stall'));
        const isOnlyText = (this.activeItem instanceof Konva.Text && this.activeItem?.hasName('textBox'));
        if (isOnlyText) {          
          this.textLength = this.activeItem?.text().length;
          return this.activeItem?.text();
        }
        else if (isStall) {
          // find child text of group
          const text = this.activeItem?.children.find((child: any) => {
            return child instanceof Konva.Text;
          });
          this.textLength = text?.text().length;
          return text?.text();
        }
        return '';
      }

      getTextLength(): number {
        return this.textLength;
      }

      getMaxTextLength(): number {
        if (this.activeItem instanceof Konva.Group && this.activeItem?.hasName('stall')) {
          return this.maxStallNameLength;
        }
        else if (this.activeItem instanceof Konva.Text && this.activeItem?.hasName('textBox')) {
          return this.maxTextLength;
        }
        else return 0;
      }

      getActiveItemRotation(): number {
        const angle = Math.round(this.activeItem?.getAttr('rotation') * 100) / 100;
        if (angle > 360) {
          return angle - 360;
        }
        else if (angle === 360) {
          return 0;
        }
        else if (angle < 0) {
          return 360 + angle;
        }
        else {
          return angle;
        }
      }

    isSensor() : boolean {
      if (this.activeItem && this.activeItem instanceof Konva.Circle) {
        return true;
      }
      this.isCardFlipped = false;

      return false;
    }

    // get SensorIds(): string[] {
    //   // filter out active selected sensor
    //   const sensors = this.sensors.filter((sensor: any) => {
    //     return sensor.attrs.customId !== this.activeItem?.attrs.customId;
    //   });

    //   // get the ids of the sensors
    //   const sensorIds = sensors.map((sensor: any) => {
    //     return sensor.attrs.customId;
    //   });

    //   return sensorIds;
    // }

    isCardFlipped = false;

    toggleCardFlip() {
      this.isCardFlipped = !this.isCardFlipped;
    }

    getSelectedSensorId(element: Konva.Circle) {
      return element.getAttr('id');
    }

    zoomIn(): void {
      this.zoomOutDisabled = false;
      const scale = this.canvasContainer.scaleX();
      if (this.currentScale !== 1) {
        this.handleScaleAndDrag(this.scaleBy, null, 'in');
      }
      else {
        this.handleScaleAndDrag(scale, null, 'in');
      }

      this.setZoomInDisabled(this.displayedSnap);
    }

    zoomOut(): void {
      this.zoomInDisabled = false;
      const scale = this.canvasContainer.scaleX();
      if (this.currentScale !== 1) {
        this.handleScaleAndDrag(this.scaleBy, null, 'out');
      }
      else {
        this.handleScaleAndDrag(scale, null, 'out');
      }

      this.setZoomOutDisabled(this.displayedSnap);
    }

    setZoomInDisabled(value: number): void {
      this.zoomInDisabled = value === this.snaps[this.snaps.length - 1] ? true : false;
    }

    setZoomOutDisabled(value: number): void {
      this.zoomOutDisabled = value === this.snaps[0] ? true : false;
    }

    setInputFocus(value: boolean) {
      this.inputHasFocus = value;
    }

    // isLinked() {
    //   this.appApiService.isLinked(this.activeItem?.getAttr('customId')).subscribe((res: any) => {
    //     if(!res['success']) {
    //       this.store.dispatch(new UpdateSensorLinkedStatus(this.activeItem?.getAttr('customId'), false));
    //     }
    //   });

    // }

      chooseDustbinImage(): string {
        if (this.openDustbin && !this.onDustbin) {
          return 'assets/trash-open.svg';
        }
        else if (!this.openDustbin && !this.onDustbin) {
          return 'assets/trash-svgrepo-com.svg';
        }
        else if (this.openDustbin && this.onDustbin) {
          return 'assets/trash-delete.svg';
        }
        else return '';
    }

    showTextInput() : boolean {
      if (!Konva) return false;
      return (this.activeItem instanceof Konva.Group && !this.activeItem.getAttr('id').includes('uploaded') || this.activeItem instanceof Konva.Text) && this.activeItem != this.selectionGroup;
    }

    showLengthInput() : boolean {
      if (!Konva) return false;
      return this.activeItem instanceof Konva.Path;
    }

    showAngleInput() : boolean {
      if (!Konva) return false;
      return this.activeItem instanceof Konva.Path || this.activeItem instanceof Konva.Group || this.activeItem instanceof Konva.Text;
    }

    showSensorLinking() : boolean {
      if (!Konva) return false;
      return this.activeItem instanceof Konva.Circle;
    }

  openFloorplanUploadModal(): void {
    this.uploadModalVisible = true;
    const modal = document.querySelector('#upload-floorpan-modal');

    modal?.classList.remove('hidden');
    setTimeout(() => {
      modal?.classList.remove('opacity-0');
    }, 100);
  }
}
