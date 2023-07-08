import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { get } from 'http';
import Konva from 'konva';
import { Line } from 'konva/lib/shapes/Line';
import { AppApiService } from '@event-participation-trends/app/api';
import { ActivatedRoute } from '@angular/router';

interface DroppedItem {
  name: string;
  konvaObject?: Konva.Line | Konva.Image | Konva.Group | Konva.Text | Konva.Path;
}
@Component({
  selector: 'event-participation-trends-createfloorplan',
  templateUrl: './createfloorplan.page.html',
  styleUrls: ['./createfloorplan.page.css'],
})

export class CreateFloorPlanPage {
    @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLDivElement>;
    @ViewChild('canvasParent', { static: false }) canvasParent!: ElementRef<HTMLDivElement>;
    @ViewChild('dustbin', { static: false }) dustbinElement!: ElementRef<HTMLImageElement>;
    @ViewChild('stall', {static: false}) stallElement!: ElementRef<HTMLImageElement>;
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
    transformer = new Konva.Transformer();
    preventCreatingWalls = true; // to prevent creating walls
    transformers: Konva.Transformer[] = [this.transformer];
    sensors: Konva.Image[] = [];
    gridSize = 10;
    paths: Konva.Path[] = [];
    activePath: Konva.Path | null = null;
    onDustbin = false;

    constructor(
      private readonly appApiService: AppApiService,
      private readonly route: ActivatedRoute,
    ) {}

    toggleEditing(): void {
      this.preventCreatingWalls = !this.preventCreatingWalls;
      this.activeItem = null;

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
            document.body.style.cursor = 'not-allowed';
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
            this.addKonvaObject(droppedItem, positionX, positionY);
        }
    }

    addKonvaObject(droppedItem: DroppedItem, positionX: number, positionY: number) {
      if (droppedItem.name.includes('png') || droppedItem.name.includes('jpg') || droppedItem.name.includes('jpeg')) {
        Konva.Image.fromURL(droppedItem.name, (image) => {
          this.setupElement(image, positionX, positionY);
          
          if (droppedItem.name.includes('stall')) {
            image.setAttr('name', 'stall');
            image.setAttr('x', 0);
            image.setAttr('y', 0);
            const group = new Konva.Group({
              id: 'stall',
              name: 'stall',
              x: positionX,
              y: positionY,
              width: 50,
              height: 50,
              draggable: true,
              cursor: 'move',
              fill: 'white',
            });
            
            const text = new Konva.Text({
              id: 'stallName',
              name: 'stallName',
              x: 0,
              y: 0,
              text: 'Stall',
              fontSize: 11,
              fontFamily: 'Calibri',
              fill: 'black',
              width: 50,
              height: 50,
              align: 'center',
              verticalAlign: 'middle',
              padding: 3,
              cursor: 'move',
            });

            group.add(image);
            group.add(text);
            this.setMouseEvents(group);
            this.canvas.add(group);
            this.canvas.draw();
            droppedItem.konvaObject = group;
          } 
          else {
            image.setAttr('name', 'sensor');
            this.sensors.push(image);
            this.canvas.add(image);
            this.canvas.draw();
            droppedItem.konvaObject = image;
          }
        });
      }
    }
    
    setupElement(element: Konva.Line | Konva.Image | Konva.Group | Konva.Path, positionX: number, positionY: number): void {
      element.setAttrs({
        x: positionX,
        y: positionY,
        width: 50,
        height: 50,
        cursor: 'move',
        draggable: true,
        cornerRadius: 2,
        padding: 20,
        fill: 'white',
        customId: this.getUniqueId(),
        opacity: 1,
      });
    
      this.setMouseEvents(element);
    }

    setMouseEvents(element: Konva.Line | Konva.Image | Konva.Group | Konva.Text | Konva.Path): void {
      element.on('dragmove', () => {
        this.activeItem = element;
        this.setTransformer(this.activeItem, undefined);
      });
      element.on('dragmove', this.onObjectMoving.bind(this));
      element.on('click', () => {
        this.activeItem = element;
        this.setTransformer(this.activeItem, undefined);
      });
      element.on('dragend', () => {
        this.openDustbin = false;
      });
      element.on('mouseenter', () => {
        document.body.style.cursor = 'move';
      });
      element.on('mouseleave', () => {
        document.body.style.cursor = 'default';
      });
    }

    removeMouseEvents(element: Konva.Line | Konva.Image | Konva.Group | Konva.Text | Konva.Path): void {
      element.off('dragmove');
      element.off('dragmove');
      element.off('click');
      element.off('dragend');
      element.off('mouseenter');
      element.off('mouseleave');
    }
        

    ngAfterViewInit(): void {
        // wait for elements to render before initializing fabric canvas
        setTimeout(() => {
            const canvasParent = this.canvasParent;

            // get width and height of the parent element
            const position = this.canvasElement.nativeElement.getBoundingClientRect();
            const positionX = position.x;
            const positionY = position.y;
            const width = canvasParent.nativeElement.offsetWidth;
            const height = canvasParent.nativeElement.offsetHeight;

            this.canvasContainer = new Konva.Stage({
                container: '#canvasElement',
                width: width*0.9783,
                height: height*0.925               
            });

            this.canvas = new Konva.Layer();

            this.canvasContainer.add(this.canvas);
            this.canvasContainer.draw();

            //set object moving
            // this.canvas.on('dragmove', this.onObjectMoving.bind(this));

            // Attach the mouse down event listener to start dragging lines
            this.canvasContainer.on('mousedown', this.onMouseDown.bind(this));

            this.createGridLines();

            this.canvasContainer.on('mouseup', this.onMouseUp.bind(this));

            // create selection box to select different components on the canvas
            this.createSelectionBox();

            this.canvasContainer.on('click', () => {
              const position = this.canvasContainer.getRelativePointerPosition();

              const component = this.canvas.getIntersection(position);

              if (!component || !(component instanceof Konva.Line) && !(component instanceof Konva.Image) && !(component instanceof Konva.Group)) {
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
            });
        }, 6);
    }

    setTransformer(mouseEvent?: Konva.Image | Konva.Group | Konva.Text, line?: Konva.Line | Konva.Path): void {
      this.transformer.detach();
      this.canvas.add(this.transformer);
      let target = null;
      if (mouseEvent) {
        target = mouseEvent;
      }
      else if (line) {
        target = line;
      }

      if (target && target instanceof Konva.Line || target instanceof Konva.Path) {
        if (line) {
          // this.transformer.nodes([line]);
          return;
        }
      } else if (target && target instanceof Konva.Image) {
        // Clicked on an existing textbox, do nothing  
        // this.transformer.nodes([this.activeItem]);
        return;
      }
      else if (target && target instanceof Konva.Group) {
        this.transformer.nodes([target]);
        return;
      }
    }

    createSelectionBox(): void {

      const tr = new Konva.Transformer();
      this.transformers.push(tr);
      this.canvas.add(tr);

      // tr.nodes([rect1, rect2]);

      const selectionBox = new Konva.Rect({
        fill: 'rgba(0,0,255,0.2)',
        visible: false,
      });

      this.canvas.add(selectionBox);

      let x1: number;
      let y1: number;
      let x2: number;
      let y2: number;

      this.canvasContainer.on('mousedown', (e) => {
        if (!this.preventCreatingWalls) {
          this.activeItem = null;
          return;
        }

        // do nothing if we mousedown on any shape
        if (e.target !== this.canvasContainer) {
          return;
        }

        e.evt.preventDefault();
        const points = this.canvasContainer.getPointerPosition();
        x1 = points ? points.x : 0;
        y1 = points ? points.y : 0;
        x2 = points ? points.x : 0;
        y2 = points ? points.y : 0;

        selectionBox.visible(true);
        selectionBox.width(0);
        selectionBox.height(0);
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
        x2 = points ? points.x : 0;
        y2 = points ? points.y : 0;

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
        const shapes = this.canvasContainer.find('.rect, .wall, .sensor, .stall, .stallName');
        const box = selectionBox.getClientRect();
        const selected = shapes.filter((shape) => {
          return Konva.Util.haveIntersection(box, shape.getClientRect());
        });
        
        //remove all previous selections
        this.transformers.forEach((tr) => {
          tr.nodes([]);
        });

        //add new selections
        if (selected.length) {
          this.transformers.forEach((tr) => {
            tr.nodes(selected);
          });
        }

        if (tr.nodes().length === 1) {
          this.activeItem = tr.nodes()[0];
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
            tr.nodes([]);
          });
          this.activeItem = null;
          return;
        }

        if (tr.nodes().length > 1){
          this.activeItem = null;
        }

        // if we are selecting with rect, do nothing
        if (selectionBox.visible()) {
          return;
        }

        // do nothing if clicked NOT on our lines or images or text
        if (!e.target.hasName('rect') && !e.target.hasName('wall') && !e.target.hasName('sensor') && !e.target.hasName('stall') && !e.target.hasName('stallName')) {
          this.activeItem = null;
          return;
        }

        // check to see if we pressed ctrl or shift
        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = tr.nodes().indexOf(e.target) >= 0;

        if (!metaPressed && !isSelected) {
          // if no key pressed and the node is not selected
          // select just one
          tr.nodes([e.target]);
        } else if (metaPressed && isSelected) {
          // if we pressed keys and node was selected
          // we need to remove it from selection:
          const nodes = tr.nodes().slice(); // use slice to have new copy of array
          // remove node from array
          nodes.splice(nodes.indexOf(e.target), 1);
          tr.nodes(nodes);

          if (tr.nodes().length > 1){
            this.activeItem = null;
          } else if (tr.nodes().length === 1) {
            this.activeItem = tr.nodes()[0];
          }

        } else if (metaPressed && !isSelected) {
          // add the node into selection
          const nodes = tr.nodes().concat([e.target]);
          tr.nodes(nodes);

          if (tr.nodes().length > 1){
            this.activeItem = null;
          }
        }
      });
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
        }

        const movedObject = event.currentTarget;
        const droppedItem = this.canvasItems.find(
            (item) => item.konvaObject === movedObject
        );

        // set bounderies for the object such that the object cannot be move beyond the borders of the canvas
        
            
        if (droppedItem) {
            const canvasWidth = this.canvasElement.nativeElement.offsetWidth;
            const canvasHeight = this.canvasElement.nativeElement.offsetHeight;
            const objectWidth = movedObject.width() * movedObject.scaleX();
            const objectHeight = movedObject.height() * movedObject.scaleY();
            const positionX = movedObject.x() || 0;
            const positionY = movedObject.y() || 0;
        
            const gridSize = this.gridSize;
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
                this.transformer.detach();
                document.body.style.cursor = 'default';
                selectedObject.remove();
                this.openDustbin = false;
                this.onDustbin = false;
                this.activeItem = null;
                
                // remove item from canvasItems array
                const index = this.canvasItems.findIndex((item) => item.konvaObject === selectedObject);
                if (index > -1) {
                    this.canvasItems.splice(index, 1);

                    // remove item from sensors array if it is a sensor
                    const sensorIndex = this.sensors.findIndex((item) => item === selectedObject);
                    if (sensorIndex > -1) {
                        this.sensors.splice(sensorIndex, 1);
                        console.log('sensor removed');
                    }
                }
                this.canvas.batchDraw();
            }

        }
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
        const grid = this.gridSize;
        const xValue = pointer ? pointer.x : 0;
        const yValue = pointer ? pointer.y : 0;
        const snapPoint = {
            x: Math.round(xValue / grid) * grid,
            y: Math.round(yValue / grid) * grid,
        };
        
        const path = new Konva.Path({
            x: snapPoint.x,
            y: snapPoint.y,
            data: 'M0,0 L0,0',
            stroke: 'black',
            strokeWidth: 5,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,
            name: 'wall'
        });

        this.activePath = path;
        path.on('dragmove', this.onObjectMoving.bind(this));
        this.canvas.add(path);
        this.canvas.batchDraw();

        this.paths.push(path);
        this.isDraggingLine = true;

        // Attach the mouse move event listener
        this.canvasContainer.on('mousemove', this.onMouseMove.bind(this));

        // Attach the mouse up event listener
        this.canvasContainer.on('mouseup', this.onMouseUp.bind(this));
      }
      
      onMouseMove(): void {
        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activePath) {
            const grid = this.gridSize;
            const xValue = pointer ? pointer.x : 0;
            const yValue = pointer ? pointer.y : 0;
            const snapPoint = {
                x: Math.round(xValue / grid) * grid,
                y: Math.round(yValue / grid) * grid,
            };
            const data = this.activePath.data();
            const startPointX = data.split(' ')[0].split(',')[0].replace('M', '');
            const startPointY = data.split(' ')[0].split(',')[1];
            const endPointX = snapPoint.x - this.activePath.x();
            const endPointY = snapPoint.y - this.activePath.y();
            const newData = `M${startPointX},${startPointY} L${endPointX},${endPointY}`;
            this.activePath.data(newData);
            this.canvas.batchDraw();
        }
      }
      
      onMouseUp(): void {
        this.openDustbin = false;

        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activePath) {
          const grid = this.gridSize;
          const xValue = pointer ? pointer.x : 0;
          const yValue = pointer ? pointer.y : 0;
          const snapPoint = {
              x: Math.round(xValue / grid) * grid,
              y: Math.round(yValue / grid) * grid,
          };
          const data = this.activePath.data();
          const startPointX = data.split(' ')[0].split(',')[0].replace('M', '');
          const startPointY = data.split(' ')[0].split(',')[1];
          const endPointX = snapPoint.x - this.activePath.x();
          const endPointY = snapPoint.y - this.activePath.y();
          const newData = `M${startPointX},${startPointY} L${endPointX},${endPointY}`;
          this.activePath.data(newData);
          this.canvas.batchDraw();

          // test if the line is more than a certain length
          const length = Math.sqrt(Math.pow(endPointX, 2) + Math.pow(endPointY, 2));
          if (length < 1) {
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
            name: 'path',
            konvaObject: this.activePath,
          });

          // set the width a.k.a length of the wall
          const width = Math.abs(snapPoint.x - this.activePath.x());
          this.activePath.setAttr('width', width); // this acts as the length of the wall (vertically or horizontally)

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
      
      createGridLines() {
        const grid = 10;
        const stage = this.canvasContainer;
        const width = stage.width();
        const height = stage.height();
        const gridGroup = new Konva.Group({
          draggable: false,
        });
        for (let i = 0; i < width / grid; i++) {
          const distance = i * grid;
          const horizontalLine = new Konva.Line({
            points: [distance, 0, distance, height],
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
        this.canvas.add(gridGroup);
        gridGroup.moveToBottom();
        this.canvas.batchDraw();
      }  
      
      shouldStackVertically = false;

      @HostListener('window:resize')
      onWindowResize() {
        this.checkScreenWidth();
      }

      // set the grid lines when the window is resized
    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
      // remove gridlines and then add them again
      this.removeGridLines();
      this.createGridLines();
    }

    removeGridLines(): void {
      this.canvas?.children?.forEach((child: any) => {
        if (child.attrs.customClass === 'grid-line') {
          child.remove();
        }
      });

      
      const width = this.canvasParent.nativeElement.offsetWidth;
      const height = this.canvasParent.nativeElement.offsetHeight;

      this.canvasContainer.setAttr('width', width*0.9783);
      this.canvasContainer.setAttr('height', height*0.965);
    }
    
      ngOnInit() {
        this.checkScreenWidth();
      }
    
      checkScreenWidth() {
        this.shouldStackVertically = window.innerWidth < 1421;
      }

      saveFloorLayout(): void {
        // remove grid lines from the JSON data
        const json = this.canvas.toObject();

        // remove the grid lines, transformers and groups from the JSON data
        json.children = json.children.filter((child: any) => {
          return child.attrs.name === 'wall' || child.attrs.name === 'stall' || child.attrs.name === 'sensor';
        });

        //stringify the JSON data
        const jsonString = JSON.stringify(json);

        // subscribe to params and get the event id
        let eventId = '';
        
        this.route.queryParams.subscribe(params => {
          eventId = params['id'];
        });

        // save the JSON data to the database
        this.appApiService.updateFloorLayout(eventId, jsonString).subscribe((res: any) => {
          console.log(res);
        });
      }

      getUniqueId(): string {
        // find latest id from sensor customId attribute first character
        const sensors = this.sensors;
        let latestId = 0;
        sensors.forEach((sensor: any) => {
            const id = parseInt(sensor.attrs.customId[1]);
            if (id > latestId) {
                latestId = id;
            }
        });

        // generate random string for the id
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        return `s${(latestId + 1).toString() + randomString}`;
      }

      updateWidth(event: any) {
        this.activeItem?.width(parseInt(event.target.value));
        this.activeItem?.scaleX(1);
      }
    
      updateHeight(event: any) {
        this.activeItem?.height(parseInt(event.target.value));
        this.activeItem?.scaleY(1);
      }

      updateRotation(event: any) {
        this.activeItem?.rotation(parseInt(event.target.value));
      }

      getActiveItemWidth(): number {
        return Math.round(this.activeItem?.width() * this.activeItem?.scaleX());
      }

      getActiveItemHeight(): number {
        return Math.round(this.activeItem?.height() * this.activeItem?.scaleY());
      }

      getActiveItemRotation(): number {
        return Math.round(this.activeItem?.rotation());
      }

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
}