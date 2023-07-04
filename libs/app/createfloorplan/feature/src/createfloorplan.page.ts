import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import Konva from 'konva';

interface DroppedItem {
  name: string;
  konvaObject?: Konva.Node;
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
    isDropdownOpen = false;
    openDustbin = false;
    canvasItems: DroppedItem[] = [];
    canvasContainer!: Konva.Stage;
    canvas!: Konva.Layer;
    isDraggingLine = false;
    lineType: 'vertical' | 'horizontal' = 'vertical';
    activeLine: Konva.Line | null = null;
    activeItem: any = null;
    lines: Konva.Line[] = [];
    // Define the fill color for the closed shapes
    fillColor = 'rgba(255, 0, 0, 0.5)'; // Example color

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
        const name = event.dataTransfer?.getData('text/plain');
        if (name) {
            const positionX = event.clientX - this.canvasElement.nativeElement.offsetLeft;
            const positionY = event.clientY - this.canvasElement.nativeElement.offsetTop;
            const droppedItem: DroppedItem = { name };
            this.canvasItems.push(droppedItem);
            this.addKonvaObject(droppedItem, positionX, positionY);
        }
    }

    addKonvaObject(droppedItem: DroppedItem, positionX: number, positionY: number) {
        const element = new Konva.Text({
            id: 'text',
            x: positionX,
            y: positionY,
            width: 100,
            height: 50,
            fill: 'blue',
            draggable: true,
            text: droppedItem.name,
            cursor: 'pointer',
        });
      
        // add dragmove event listener
        element.on('dragmove', this.onObjectMoving.bind(this));

        droppedItem.konvaObject = element;

        this.canvas.add(element);
        this.canvas.draw();
      }

    ngAfterViewInit(): void {
        // wait for elements to render before initializing fabric canvas
        setTimeout(() => {
            const canvasParent = this.canvasParent;

            // get width and height of the parent element
            const width = canvasParent.nativeElement.offsetWidth;
            const height = canvasParent.nativeElement.offsetHeight;

            this.canvasContainer = new Konva.Stage({
                container: '#canvasElement',
                width: width*0.965,
                height: height*0.965                
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

        }, 6);
    }

    onObjectMoving(event: Konva.KonvaEventObject<DragEvent>): void {
        if (this.activeItem !== event.target) {
          if (this.activeItem) {
            this.activeItem.setAttr('customClass', '');
          }
          this.activeItem = event.target;
          this.activeItem.setAttr('customClass', 'active');
        }
      
        const movedObject = event.currentTarget as Konva.Node;
        const droppedItem = this.canvasItems.find(
          (item) => item.konvaObject === movedObject
        );
      
        if (droppedItem) {
          const canvasWidth = this.canvasElement.nativeElement.offsetWidth;
          const canvasHeight = this.canvasElement.nativeElement.offsetHeight;
          const objectWidth = movedObject.width() * movedObject.scaleX();
          const objectHeight = movedObject.height() * movedObject.scaleY();
          const positionX = event.target.x() || 0; // Use event.target.x() to get the current position
          const positionY = event.target.y() || 0; // Use event.target.y() to get the current position
      
          const gridSize = 10;
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
            y: limitedY,
          });
      
          // Update the limits check to use limitedX and limitedY
          if (limitedX < minX) {
            movedObject.setAttr('x', minX);
          } else if (limitedX > maxX) {
            movedObject.setAttr('x', maxX);
          }
      
          if (limitedY < minY) {
            movedObject.setAttr('y', minY);
          } else if (limitedY > maxY) {
            movedObject.setAttr('y', maxY);
          }
      
          this.canvas.batchDraw();
      
          this.openDustbin = true;
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
            const selectedObject = this.canvas.findOne((obj: any) => obj.getAttr('customClass') === 'active');
            if (selectedObject) {
                selectedObject.remove();
                // remove item from canvasItems array
                const index = this.canvasItems.findIndex((item) => item.konvaObject === selectedObject);
                if (index > -1) {
                    this.canvasItems.splice(index, 1);
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
        const gridSize = 10; // Adjust this value according to your needs
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
        if (target && target instanceof Konva.Line) {
            // Clicked on an existing line, do nothing
            return;
        } else if (target && target instanceof Konva.Text) {
            // Clicked on an existing textbox, do nothing
            return;
        }
        
        const pointer = this.canvasContainer.getPointerPosition();
        const grid = 10;
        const xValue = pointer ? pointer.x : 0;
        const yValue = pointer ? pointer.y : 0;
        const snapPoint = {
            x: Math.round(xValue / grid) * grid,
            y: Math.round(yValue / grid) * grid,
        };
        
        const line = new Konva.Line({
          points: [snapPoint.x, snapPoint.y, snapPoint.x, snapPoint.y],
          stroke: '#000',
          strokeWidth: 5,
          draggable: true,
        });

        this.activeLine = line;
        // Attach the drag move event listener to finish dragging lines
        line.on('dragmove', this.onObjectMoving.bind(this));
        this.canvas.add(line);
        this.canvas.draw();
        this.lines.push(line);
        this.isDraggingLine = true;
      
        // Attach the mouse move event listener
        this.canvasContainer.on('mousemove', this.onMouseMove.bind(this));
      
        // Attach the mouse up event listener to finish dragging lines
        this.canvasContainer.on('mouseup', this.onMouseUp.bind(this))

      }
      
      onMouseMove(): void {
        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activeLine) {
            const grid = 10;
            const xValue = pointer ? pointer.x : 0;
            const yValue = pointer ? pointer.y : 0;
            const snapPoint = {
                x: Math.round(xValue / grid) * grid,
                y: Math.round(yValue / grid) * grid,
            };
            const points = this.activeLine.points();
            points[2] = snapPoint.x;
            points[3] = snapPoint.y;
            this.activeLine.points(points);
            this.canvas.batchDraw();
        }
      }
      
      onMouseUp(): void {
        this.openDustbin = false;

        const pointer = this.canvasContainer.getPointerPosition();
        if (this.activeLine) {
            const grid = 10;
            const xValue = pointer ? pointer.x : 0;
            const yValue = pointer ? pointer.y : 0;
            const snapPoint = {
                x: Math.round(xValue / grid) * grid,
                y: Math.round(yValue / grid) * grid,
            };
            const points = this.activeLine.points();
            points[2] = snapPoint.x;
            points[3] = snapPoint.y;
            this.activeLine.points(points);
            this.canvas.batchDraw();
            //add line to canvasItems array
            this.canvasItems.push({
                name: 'line',
                konvaObject: this.activeLine,
            });

            // check if the line being dragged can join with another line if the end points are close enough
            let joined = false;
            const lines = this.canvas.find('Line');
            const activeLinePoints = this.activeLine.points();
            const activeLineStartPoint = {
                x: activeLinePoints[0],
                y: activeLinePoints[1],
            };

            const activeLineEndPoint = {
                x: activeLinePoints[2],
                y: activeLinePoints[3],
            };

            lines.forEach((line: any) => {
                if (line !== this.activeLine && line.getAttr('customClass') !== 'grid-line') {
                    const points = line.points();
                    const startPoint = {
                        x: points[0],
                        y: points[1],
                    };
                    const endPoint = {
                        x: points[2],
                        y: points[3],
                    };

                    const distanceBetweenStartPoints = Math.sqrt(
                        Math.pow(activeLineStartPoint.x - startPoint.x, 2) +
                        Math.pow(activeLineStartPoint.y - startPoint.y, 2)
                    );

                    const distanceBetweenEndPoints = Math.sqrt(
                        Math.pow(activeLineEndPoint.x - endPoint.x, 2) +
                        Math.pow(activeLineEndPoint.y - endPoint.y, 2)
                    );

                    const distanceBetweenStartAndEndPoints = Math.sqrt(
                        Math.pow(activeLineStartPoint.x - endPoint.x, 2) +
                        Math.pow(activeLineStartPoint.y - endPoint.y, 2)
                    );

                    const distanceBetweenEndAndStartPoints = Math.sqrt(
                        Math.pow(activeLineEndPoint.x - startPoint.x, 2) +
                        Math.pow(activeLineEndPoint.y - startPoint.y, 2)
                    );

                    if (distanceBetweenStartPoints < 10) {
                        // Snap to the start point of the line
                        this.activeLine?.points([startPoint.x, startPoint.y, activeLineEndPoint.x, activeLineEndPoint.y]);
                        this.canvas.batchDraw();
                        joined = true;
                    } else if (distanceBetweenEndPoints < 10) {
                        // Snap to the end point of the line
                        this.activeLine?.points([activeLineStartPoint.x, activeLineStartPoint.y, endPoint.x, endPoint.y]);
                        this.canvas.batchDraw();
                        joined = true;
                    } else if (distanceBetweenStartAndEndPoints < 10) {
                        // Snap to the end point of the line
                        this.activeLine?.points([endPoint.x, endPoint.y, activeLineEndPoint.x, activeLineEndPoint.y]);
                        this.canvas.batchDraw();
                        joined = true;
                    } else if (distanceBetweenEndAndStartPoints < 10) {
                        // Snap to the end point of the line
                        this.activeLine?.points([activeLineStartPoint.x, activeLineStartPoint.y, startPoint.x, startPoint.y]);
                        this.canvas.batchDraw();
                        joined = true;
                    }

                    console.log(joined);
                }
            });

            this.activeLine = null;                      
        }

        this.isDraggingLine = false;
      
        // Remove the mouse move event listener
        this.canvas.off('mousemove', this.onMouseMove.bind(this));
      
        // Remove the mouse up event listener
        this.canvas.off('mouseup', this.onMouseUp.bind(this));

        this.isClosedShape();
        
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
    
      ngOnInit() {
        this.checkScreenWidth();
      }
    
      checkScreenWidth() {
        this.shouldStackVertically = window.innerWidth < 1421;
      }

      isClosedShape(): boolean {
        let closedPathPoints: {
            startX: number,
            startY: number,
            endX: number,
            endY: number,
        }[] = [];
        // Check if the shape is closed
        const lines = this.lines;
        const points: {
            startX: number,
            startY: number,
            endX: number,
            endY: number,
        }[] = [];
        lines.forEach((line: any) => {
            points.push({
                startX: line.points()[0],
                startY: line.points()[1],
                endX: line.points()[2],
                endY: line.points()[3],
            });
        });

        for (let i = 0; i < points.length - 3; i++) {
            for (let j = i+1; j < points.length - 2; j++) {
                for (let k = j+1; k < points.length - 1; k++) {
                    for (let l = k+1; l < points.length; l++) {
                        // see if the first line's endpoint is the same as the next point's start point and so on
                        if (points[i].endX === points[j].startX && points[i].endY === points[j].startY &&
                            points[j].endX === points[k].startX && points[j].endY === points[k].startY &&
                            points[k].endX === points[l].startX && points[k].endY === points[l].startY &&
                            points[l].endX === points[i].startX && points[l].endY === points[i].startY) {
                                closedPathPoints = [points[i], points[j], points[k], points[l]];
                        }
                        
                    }
                }
            }
        }

        if (closedPathPoints.length > 0) {
            // Create the SVG path commands based on the points in the closedPathPoints array
            const pathData = `M${closedPathPoints[0].startX} ${closedPathPoints[0].startY} L${closedPathPoints[1].startX} ${closedPathPoints[1].startY} L${closedPathPoints[2].startX} ${closedPathPoints[2].startY} L${closedPathPoints[3].startX} ${closedPathPoints[3].startY} Z`;
          
            // Create a Konva.Path object
            const path = new Konva.Path({
              x: 0,
              y: 0,
              data: pathData,
              fill: '#00D2FF',
              stroke: 'black',
              strokeWidth: 2,
            });
          
            // Add the path to the layer or stage for rendering
            this.canvas.add(path);

            return true;
          }

        return false;
      }

      
}