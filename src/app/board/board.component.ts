import { Component, OnInit } from '@angular/core';

import { MathfieldElement } from 'mathlive';
import TeXToSVG from "tex-to-svg";
import { CollisionService } from '../collision.service';

import { AngularFireDatabase } from '@angular/fire/compat/database';




// $blue: #3498db;
// $red: #e74c3c;
// $yellow: #f1c40f;
// $green: #2ecc71;
// $pink: #e91e63;
// $orange: #ff9800;
// $purple: #9c27b0;
// $black: #000000;
enum Color {
  blue = '#3498db',
  red = '#e74c3c',
  yellow = '#f1c40f',
  green = '#2ecc71',
  pink = '#e91e63',
  orange = '#ff9800',
  purple = '#9c27b0',
  black = '#000000'
}

function colorToString(color:Color) {
  switch(color) {
    case Color.blue:
      return 'blue';
    case Color.red:
      return 'red';
    case Color.yellow:
      return 'yellow';
    case Color.green:
      return 'green';
    case Color.pink:
      return 'pink';
    case Color.orange:
      return 'orange';
    case Color.purple:
      return 'purple';
    case Color.black:
      return 'black';
  }
}

enum Tool {
  pen,
  eraser,
  line,
  arrow,
  rectangle,
  circle,
  math
}
function toolToString(tool:Tool) {
  switch(tool) {
    case Tool.pen:
      return 'pen';
    case Tool.eraser:
      return 'eraser';
    case Tool.line:
      return 'line';
    case Tool.arrow:
      return 'arrow';
    case Tool.rectangle:
      return 'rectangle';
    case Tool.circle:
      return 'circle';
    case Tool.math:
      return 'math';
  }
}

enum Style{
  veryThin=1,
  thin=2,
  medium=4,
  thick=10,
  veryThick=20
}

function styleToString(style:Style) {
  switch(style) {
    case Style.veryThin:
      return 'very-thin';
    case Style.thin:
      return 'thin';
    case Style.medium:
      return 'medium';
    case Style.thick:
      return 'thick';
    case Style.veryThick:
      return 'very-thick';
  }
}

function genKey() {
  // generate a string composed of [a-zA-Z0-9] of length 10
  let key = "";
  for(let i = 0; i < 10; i++) {
    let r = Math.floor(Math.random() * 62);
    if(r < 10) {
      key += r;
    } else if(r < 36) {
      key += String.fromCharCode(r + 55);
    } else {
      key += String.fromCharCode(r + 61);
    }
  }
  return key;
}

function round(n:number, d:number) {
  return Math.round(n * 10**d) / 10**d;
}
function fmod(a:number, b:number) {
  return +(a - (Math.floor(a / b) * b)).toFixed(8);
}

const COS_45 = Math.sqrt(2)/2;
const SIN_45 = Math.sqrt(2)/2;
const UPDATE_DB_DELAY = 200; 
const ARROW_LENGHT = 6;



@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {

  svg:HTMLElement|any = null;
  mathfield:MathfieldElement|any = null;

  selectedColor:Color = Color.black;
  selectedTool:Tool = Tool.pen;
  selectedStyle:Style = Style.medium;
  C:typeof Color = Color;
  T:typeof Tool = Tool;
  S:typeof Style = Style;

  transparent:boolean = false;
  dashed:boolean = false;

  board_id:string = "dvz841cef4z2"



  // list of objects, type, data
  actual_object:string|any = null;
  last_actual_object:string|any = null; // protected against changed object
  objects:Map<string, SVGElement|any> = new Map<string, any>();
  objects_data:Map<string, {type:number, color:string, style:number, transparent:boolean, dashed?:boolean, shape:any[]}> = new Map<string, any>();



  eraser_last:[number, number]|any = null;
  eraser_on:boolean = false;

  typeMath:boolean = false;
  changeResolution:boolean = false;

  // when an object is modified, wait 1 second before updating the database
  // if the object is modified again, reset the timer
  
  update_db_timeout:any = null;

  right_click:[number, number]|any = null;
  actual_translate:[number, number] = [0, 0];


  constructor(private db: AngularFireDatabase) { }

  ngOnInit(): void {


    this.db.database.ref('boards/'+this.board_id+"/objects").on('value', (snapshot) => {
      // only get what changed
      let data = snapshot.val();


      let object_exists = new Map<string, boolean>();
      
      for (let key of this.objects_data.keys()) {
        object_exists.set(key, false);
      }
      if (this.actual_object != null)
        object_exists.set(this.actual_object, true);

      // iterate over key, value (string, object)
      for(let key in data) {
        let object = data[key];

        object_exists.set(key, true);
        
        if (!this.objects_data.has(key)) {
          if (object.type == Tool.pen){
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let d = "M " + object.shape[0][0] + " " + object.shape[0][1];
            for(let i = 1; i < object.shape.length; i++) {
              d += " L " + object.shape[i][0] + " " + object.shape[i][1];
            }
            svg.setAttribute('d', d);
            svg.setAttribute('stroke', object.color);
            svg.setAttribute('stroke-width', object.style.toString());
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('fill', 'none');
            if (object.transparent)
              svg.setAttribute('stroke-opacity', '0.5');
            if (object.dashed)
              svg.setAttribute('stroke-dasharray', (object.style*2).toString());

            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            this.svg.appendChild(svg);
          }
          else if (object.type == Tool.line){
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            svg.setAttribute('x1', object.shape[0][0].toString());
            svg.setAttribute('y1', object.shape[0][1].toString());
            svg.setAttribute('x2', object.shape[1][0].toString());
            svg.setAttribute('y2', object.shape[1][1].toString());
            svg.setAttribute('stroke', object.color);
            svg.setAttribute('stroke-width', object.style.toString());
            svg.setAttribute('stroke-linecap', 'round');
            if (object.transparent)
              svg.setAttribute('stroke-opacity', '0.5');
            if (object.dashed)
              svg.setAttribute('stroke-dasharray', (object.style*2).toString());
            
            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            this.svg.appendChild(svg);
          }
          else if (object.type == Tool.arrow){
            let svg = [
              document.createElementNS('http://www.w3.org/2000/svg', 'line'),
              document.createElementNS('http://www.w3.org/2000/svg', 'line'),
              document.createElementNS('http://www.w3.org/2000/svg', 'line')
            ];

            for(let i = 0; i < 3; i++) {
              svg[i].setAttribute('stroke', object.color);
              svg[i].setAttribute('stroke-width', object.style.toString());
              svg[i].setAttribute('stroke-linecap', 'round');
              if (object.transparent)
                svg[i].setAttribute('stroke-opacity', '0.5');
              if (object.dashed)
                svg[i].setAttribute('stroke-dasharray', (object.style*2).toString());
            }
            
            let x = object.shape[1][0];
            let y = object.shape[1][1];
            let vx = object.shape[1][0] - object.shape[0][0];
            let vy = object.shape[1][1] - object.shape[0][1];
            let l = Math.sqrt(vx*vx + vy*vy);
            vx /= l;
            vy /= l;

            let x2_right = x + (vx * -COS_45 - vy * -SIN_45) * ARROW_LENGHT * object.style;
            let y2_right = y + (vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * object.style;
            let x2_left = x + (vx * -COS_45 + vy * -SIN_45) * ARROW_LENGHT * object.style;
            let y2_left = y + (-vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * object.style;

            svg[0].setAttribute('x1', object.shape[0][0].toString());
            svg[0].setAttribute('y1', object.shape[0][1].toString());
            svg[0].setAttribute('x2', x.toString());
            svg[0].setAttribute('y2', y.toString());

            svg[1].setAttribute('x1', x.toString());
            svg[1].setAttribute('y1', y.toString());
            svg[1].setAttribute('x2', x2_right.toString());
            svg[1].setAttribute('y2', y2_right.toString());

            svg[2].setAttribute('x1', x.toString());
            svg[2].setAttribute('y1', y.toString());
            svg[2].setAttribute('x2', x2_left.toString());
            svg[2].setAttribute('y2', y2_left.toString());

            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            for(let i = 0; i < 3; i++) {
              this.svg.appendChild(svg[i]);
            }
          }
          else if (object.type == Tool.rectangle){
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            let xo = Math.min(object.shape[0][0], object.shape[1][0]);
            let yo = Math.min(object.shape[0][1], object.shape[1][1]);
            let width = Math.abs(object.shape[0][0] - object.shape[1][0]);
            let height = Math.abs(object.shape[0][1] - object.shape[1][1]);
            svg.setAttribute('x', xo.toString());
            svg.setAttribute('y', yo.toString());
            svg.setAttribute('width', width.toString());
            svg.setAttribute('height', height.toString());
            svg.setAttribute('stroke', object.color);
            svg.setAttribute('stroke-width', object.style.toString());
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('fill', 'none');
            if (object.transparent)
              svg.setAttribute('stroke-opacity', '0.5');
            if (object.dashed)
              svg.setAttribute('stroke-dasharray', (object.style*2).toString());
            
            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            this.svg.appendChild(svg);
          }
          else if (object.type == Tool.circle){
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            svg.setAttribute('cx', object.shape[0][0].toString());
            svg.setAttribute('cy', object.shape[0][1].toString());
            svg.setAttribute('rx', object.shape[1].toString());
            svg.setAttribute('ry', object.shape[1].toString());
            svg.setAttribute('stroke', object.color);
            svg.setAttribute('stroke-width', object.style.toString());
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('fill', 'none');
            if (object.transparent)
              svg.setAttribute('stroke-opacity', '0.5');
            if (object.dashed)
              svg.setAttribute('stroke-dasharray', (object.style*2).toString());
            
            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            this.svg.appendChild(svg);
          }
          else if (object.type == Tool.math){
            let svg = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            let value = object.shape[2];
            let svg_str = TeXToSVG(value);

            svg.setAttribute('x', object.shape[0][0].toString());
            svg.setAttribute('y', object.shape[0][1].toString());
            
            svg.setAttribute('style', `
              box-shadow: 0px 0px 5px 8px #FFFFFF;
              background-color: #FFFFFF;
            ` + 'color: ' + object.color + ';' + (object.transparent ? 'opacity: 0.5;' : ''));

            svg.innerHTML = svg_str
            let svg_content:any = svg.firstChild;
            if (!svg_content) return;

            let width = parseFloat(svg_content.getAttribute('width'));
            let height = parseFloat(svg_content.getAttribute('height'));
            let ratio = width / height;

            let size = 0
            switch (object.style) {
              case Style.veryThin:
                size = 12;
                break;
              case Style.thin:
                size = 18;
                break;
              case Style.medium:
                size = 25;
                break;
              case Style.thick:
                size = 40;
                break;
              case Style.veryThick:
                size = 60;
                break;
            }

            let height_px = size * height / 2.0;
            let width_px = height_px * ratio ;

            svg.setAttribute('width', width_px.toString());
            svg.setAttribute('height', height_px.toString());
            // set style 'vertical-align' 0
            svg_content.setAttribute('style', 'vertical-align: 0;');
            svg_content.setAttribute('width', width_px+"px");
            svg_content.setAttribute('height', height_px+"px");

            this.objects.set(key, svg);
            this.objects_data.set(key, object);
            this.svg.appendChild(svg);
          }
        }
        else if (key != this.actual_object){

          if (object.type == Tool.pen){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){
              svg_data.shape = object.shape;
              var d = "";
              for (let i = 0; i < object.shape.length; i++){
                if (i == 0)
                  d += "M ";
                else
                  d += "L ";
                d += object.shape[i][0].toString() + " " + object.shape[i][1].toString() + " ";
              }
              svg.setAttribute('d', d);
            }
          }
          else if (object.type == Tool.line){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){
              svg_data.shape = object.shape;
              svg.setAttribute('x1', object.shape[0][0].toString());
              svg.setAttribute('y1', object.shape[0][1].toString());
              svg.setAttribute('x2', object.shape[1][0].toString());
              svg.setAttribute('y2', object.shape[1][1].toString());
            }
          }
          else if (object.type == Tool.rectangle){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){
              svg_data.shape = object.shape;
              let xo = Math.min(object.shape[0][0], object.shape[1][0]);
              let yo = Math.min(object.shape[0][1], object.shape[1][1]);
              let width = Math.abs(object.shape[0][0] - object.shape[1][0]);
              let height = Math.abs(object.shape[0][1] - object.shape[1][1]);
              svg.setAttribute('x', xo.toString());
              svg.setAttribute('y', yo.toString());
              svg.setAttribute('width', width.toString());
              svg.setAttribute('height', height.toString());
            }
          }
          else if (object.type == Tool.circle){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){
              svg_data.shape = object.shape;
              svg.setAttribute('cx', object.shape[0][0].toString());
              svg.setAttribute('cy', object.shape[0][1].toString());
              svg.setAttribute('rx', object.shape[1].toString());
              svg.setAttribute('ry', object.shape[1].toString());
            }
          }
          else if (object.type == Tool.math){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){
              svg_data.shape = object.shape;
              let value = object.shape[2];
              let svg_str = TeXToSVG(value);

              svg.setAttribute('x', object.shape[0][0].toString());
              svg.setAttribute('y', object.shape[0][1].toString());
              
              svg.setAttribute('style', `
                box-shadow: 0px 0px 5px 8px #FFFFFF;
                background-color: #FFFFFF;
              ` + 'color: ' + object.color + ';' + (object.transparent ? 'opacity: 0.5;' : ''));

              svg.innerHTML = svg_str
              let svg_content:any = svg.firstChild;
              if (!svg_content) return;

              let width = parseFloat(svg_content.getAttribute('width'));
              let height = parseFloat(svg_content.getAttribute('height'));
              let ratio = width / height;

              let size = 0
              switch (object.style) {
                case Style.veryThin:
                  size = 12;
                  break;
                case Style.thin:
                  size = 18;
                  break;
                case Style.medium:
                  size = 25;
                  break;
                case Style.thick:
                  size = 40;
                  break;
                case Style.veryThick:
                  size = 60;
                  break;
              }

              let height_px = size * height / 2.0;
              let width_px = height_px * ratio ;

              svg.setAttribute('width', width_px.toString());
              svg.setAttribute('height', height_px.toString());
              // set style 'vertical-align' 0
              svg_content.setAttribute('style', 'vertical-align: 0;');
              svg_content.setAttribute('width', width_px+"px");
              svg_content.setAttribute('height', height_px+"px");
            }
          }
          else if (object.type == Tool.arrow){
            let svg = this.objects.get(key);
            let svg_data = this.objects_data.get(key);
            if (svg && svg_data){

              let x = object.shape[1][0];
              let y = object.shape[1][1];
              let vx = object.shape[1][0] - object.shape[0][0];
              let vy = object.shape[1][1] - object.shape[0][1];
              let l = Math.sqrt(vx*vx + vy*vy);
              vx /= l;
              vy /= l;

              let x2_right = x + (vx * -COS_45 - vy * -SIN_45) * ARROW_LENGHT * object.style;
              let y2_right = y + (vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * object.style;
              let x2_left = x + (vx * -COS_45 + vy * -SIN_45) * ARROW_LENGHT * object.style;
              let y2_left = y + (-vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * object.style;

              svg[0].setAttribute('x1', object.shape[0][0].toString());
              svg[0].setAttribute('y1', object.shape[0][1].toString());
              svg[0].setAttribute('x2', x.toString());
              svg[0].setAttribute('y2', y.toString());

              svg[1].setAttribute('x1', x.toString());
              svg[1].setAttribute('y1', y.toString());
              svg[1].setAttribute('x2', x2_right.toString());
              svg[1].setAttribute('y2', y2_right.toString());

              svg[2].setAttribute('x1', x.toString());
              svg[2].setAttribute('y1', y.toString());
              svg[2].setAttribute('x2', x2_left.toString());
              svg[2].setAttribute('y2', y2_left.toString());
            }
          }
        }
      }
      
      // delete each object where object_exists is false
      for (let [key, value] of object_exists.entries()) {
        if (!value) {
          let svg = this.objects.get(key);
          // if svg is list

          if (svg)
            if (!svg.length)this.svg.removeChild(svg);
            else{
              for (let i = 0; i < svg.length; i++) {
                this.svg.removeChild(svg[i]);
              }
            }
          this.objects.delete(key);
          this.objects_data.delete(key);
          
        }
      }
    });


    MathfieldElement.fontsDirectory = "assets/fonts";
    MathfieldElement.soundsDirectory = "assets/sounds";

    
    

    let target = document.getElementById('svg');
    if (target) {
      this.svg = target;
    }


    this.mathfield = new MathfieldElement();
    this.mathfield.addEventListener('input', (event:Event) => {
      this.updateMath();
    });
    // on focus open virtual keyboard
    this.mathfield.addEventListener('focus', (event:Event) => {
      window.mathVirtualKeyboard.show();
      if (this.changeResolution)
      {
        this.changeResolution = false;
        setTimeout(() => {
          this.computeBackground();
        }, 100);
      }
      
    });
    this.mathfield.addEventListener('focusout', (event:Event) => {
      if (this.typeMath)
        setTimeout(() => {
          this.mathfield.focus();
        }, 100);
    });
    // on enter pressed, valid the math
    this.mathfield.addEventListener('keydown', (event:KeyboardEvent) => {
      if (event.key == 'Tab') {
        this.validMath();
      }
    });


    this.mathfield.setAttribute("style", "width: 50vw; font-size: 2em;")

    window.mathVirtualKeyboard.alphabeticLayout = 'azerty';
    // window.mathVirtualKeyboard.container = document.getElementById('keyboard');
    this.mathfield.mathVirtualKeyboardPolicy = 'manual';
    // remove the virtual keyboard button
    this.mathfield.setAttribute('data-math-keyboard', 'off');
    
    


    let dom = document.getElementById('mathfield');
    dom?.appendChild(this.mathfield);
    




    this.selectColor(Color.black);
    this.selectTool(Tool.pen);
    this.selectStyle(Style.medium);

    this.computeBackground();

  }

  selectColor(color:Color) {
    document.getElementById('color-'+colorToString(this.selectedColor))?.classList.remove('selected');
    this.selectedColor = color;
    document.getElementById('color-'+colorToString(this.selectedColor))?.classList.add('selected');

    if (this.typeMath){

      this.objects.get(this.actual_object).setAttribute('style', `
          box-shadow: 0px 0px 5px 8px #FFFFFF;
          background-color: #FFFFFF;
        ` + 'color: ' + this.selectedColor + ';' + (this.transparent ? 'opacity: 0.5;' : ''));
      this.updateMath(null);
    }
  }
  selectTool(tool:Tool) {
    document.getElementById('tool-'+toolToString(this.selectedTool))?.classList.remove('selected');
    this.selectedTool = tool;
    document.getElementById('tool-'+toolToString(this.selectedTool))?.classList.add('selected');
  }
  selectStyle(style:Style) {
    document.getElementById('style-'+styleToString(this.selectedStyle))?.classList.remove('selected');
    this.selectedStyle = style;
    document.getElementById('style-'+styleToString(this.selectedStyle))?.classList.add('selected');
    if (this.typeMath){
      this.updateMath(null);
    }
  }
  toggleTransparency() {
    this.transparent = !this.transparent;
    if (this.transparent) {
      document.getElementById('style-transparency')?.classList.add('selected');
    }
    else document.getElementById('style-transparency')?.classList.remove('selected');

    if (this.typeMath){
      this.objects.get(this.actual_object).setAttribute('style', `
          box-shadow: 0px 0px 5px 8px #FFFFFF;
          background-color: #FFFFFF;
        ` + 'color: ' + this.selectedColor + ';' + (this.transparent ? 'opacity: 0.5;' : ''));
      this.updateMath(null);
    }
  }
  toggleDashed(){
    this.dashed = !this.dashed;
    if (this.dashed) {
      document.getElementById('style-dashed')?.classList.add('selected');
    } 
    else document.getElementById('style-dashed')?.classList.remove('selected');
  }

  

  mouseToSVG(x:number, y:number) {
    let svgbox = this.svg.getBoundingClientRect();
    let svgX = svgbox.x;
    let svgY = svgbox.y;
    let svgWidth = svgbox.width;
    let svgHeight = svgbox.height;
    let virtualWidth = 1000;
    let virtualHeight = 1000;

    let scale = Math.min(svgWidth / virtualWidth, svgHeight / virtualHeight);
    

    let svgOx = 0;
    let svgOy = 0;

    if (svgWidth > svgHeight) {
      svgOx = (svgWidth / scale - virtualWidth) / 2.0 ;
    } else {
      svgOy = (svgHeight / scale - virtualHeight) / 2.0 ;
    }


    
    let svgPosX = (x - svgX) / scale - svgOx;
    let svgPosY = (y - svgY) / scale - svgOy;

    
    return [round(svgPosX + this.actual_translate[0], 2), round(svgPosY + this.actual_translate[1], 2)];
  }


  mouseDown(event:MouseEvent) {
    if (event.button == 0) {


      let pos = this.mouseToSVG(event.clientX, event.clientY);
      let x = pos[0]
      let y = pos[1]
      if (this.selectedTool == Tool.pen) {
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.setAttribute('stroke', this.selectedColor);
        svg.setAttribute('stroke-width', this.selectedStyle.toString());
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke-linecap', 'round');
        if (this.transparent) {
          svg.setAttribute('stroke-opacity', '0.5');
        }if (this.dashed) {
          svg.setAttribute('stroke-dasharray', (this.selectedStyle*2).toString());
        }
        svg.setAttribute('d', 'M '+x+' '+y);

        this.svg.appendChild(svg);
        
        this.actual_object = genKey();
        this.last_actual_object = this.actual_object;
        this.objects.set(this.actual_object, svg);
        this.objects_data.set(this.actual_object, {
          type: Tool.pen,
          color: this.selectedColor,
          style: this.selectedStyle,
          transparent: this.transparent,
          dashed: this.dashed,
          shape:[[x, y]]
        });
      }
      else if (this.selectedTool == Tool.eraser) {
        this.eraser_last = [x, y];
        this.eraser_on = true;
        this.erase(this.eraser_last, [x, y]);
      }
      else if (this.selectedTool == Tool.line) {
        // use stroke-linecap
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        svg.setAttribute('stroke', this.selectedColor);
        svg.setAttribute('stroke-width', this.selectedStyle.toString());
        svg.setAttribute('fill', 'none');
        svg.setAttribute('x1', x.toString());
        svg.setAttribute('y1', y.toString());
        svg.setAttribute('x2', x.toString());
        svg.setAttribute('y2', y.toString());
        svg.setAttribute('stroke-linecap', 'round');
        if (this.transparent) {
          svg.setAttribute('stroke-opacity', '0.5');
        } if (this.dashed) {
          svg.setAttribute('stroke-dasharray', (this.selectedStyle*2).toString());
        }
        this.svg.appendChild(svg);

        this.actual_object = genKey();
        this.last_actual_object = this.actual_object;
        this.objects.set(this.actual_object, svg);
        this.objects_data.set(this.actual_object, {
          type: Tool.line,
          color: this.selectedColor,
          style: this.selectedStyle,
          transparent: this.transparent,
          dashed: this.dashed,
          shape:[[x, y], [x, y]]
        });

      }
      else if (this.selectedTool == Tool.arrow) {
        let svg = [
          document.createElementNS('http://www.w3.org/2000/svg', 'line'),
          document.createElementNS('http://www.w3.org/2000/svg', 'line'),
          document.createElementNS('http://www.w3.org/2000/svg', 'line')
        ];

        for (let i = 0; i < svg.length; i++) {
          svg[i].setAttribute('stroke', this.selectedColor);
          svg[i].setAttribute('stroke-width', this.selectedStyle.toString());
          svg[i].setAttribute('stroke-linecap', 'round');
          if (this.transparent) {
            svg[i].setAttribute('stroke-opacity', '0.5');
          } if (this.dashed) {
            svg[i].setAttribute('stroke-dasharray', (this.selectedStyle*2).toString());
          }
          this.svg.appendChild(svg[i]);
        }
        
        for (let i = 0; i < svg.length; i++) {
          svg[i].setAttribute('x1', x.toString());
          svg[i].setAttribute('y1', y.toString());
          svg[i].setAttribute('x2', x.toString());
          svg[i].setAttribute('y2', y.toString());
        }

        this.actual_object = genKey();
        this.last_actual_object = this.actual_object;
        this.objects.set(this.actual_object, svg);
        this.objects_data.set(this.actual_object, {
          type: Tool.arrow,
          color: this.selectedColor,
          style: this.selectedStyle,
          transparent: this.transparent,
          dashed: this.dashed,
          shape:[[x, y], [x, y]]
        });

      }
      else if (this.selectedTool == Tool.rectangle) {
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        svg.setAttribute('stroke', this.selectedColor);
        svg.setAttribute('stroke-width', this.selectedStyle.toString());
        svg.setAttribute('fill', 'none');
        svg.setAttribute('x', x.toString());
        svg.setAttribute('y', y.toString());
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('stroke-linecap', 'round');

        if (this.transparent) {
          svg.setAttribute('stroke-opacity', '0.5');
        } if (this.dashed) {
          svg.setAttribute('stroke-dasharray', (this.selectedStyle*2).toString());
        }
        this.svg.appendChild(svg);

        this.actual_object = genKey();
        this.last_actual_object = this.actual_object;
        this.objects.set(this.actual_object, svg);
        this.objects_data.set(this.actual_object, {
          type: Tool.rectangle,
          color: this.selectedColor,
          style: this.selectedStyle,
          transparent: this.transparent,
          dashed: this.dashed,
          shape:[[x, y], [x, y]]
        });
      }
      else if (this.selectedTool == Tool.circle) {

        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        svg.setAttribute('stroke', this.selectedColor);
        svg.setAttribute('stroke-width', this.selectedStyle.toString());
        svg.setAttribute('fill', 'none');
        svg.setAttribute('cx', x.toString());
        svg.setAttribute('cy', y.toString());
        svg.setAttribute('rx', "0");
        svg.setAttribute('ry', "0");
        svg.setAttribute('stroke-linecap', 'round');
        if (this.transparent) {
          svg.setAttribute('stroke-opacity', '0.5');
        } if (this.dashed) {
          svg.setAttribute('stroke-dasharray', (this.selectedStyle*2).toString());
        }
        this.svg.appendChild(svg);

        this.actual_object = genKey();
        this.last_actual_object = this.actual_object;
        this.objects.set(this.actual_object, svg);
        this.objects_data.set(this.actual_object, {
          type: Tool.circle,
          color: this.selectedColor,
          style: this.selectedStyle,
          transparent: this.transparent,
          dashed: this.dashed,
          shape:[[x, y], 0]
        });
      }
      else if (this.selectedTool == Tool.math) {
        if (!this.typeMath){

          this.typeMath = true;
          this.changeResolution = true;
          document.getElementById("header")?.classList.add("small");


          let svg_str = TeXToSVG("...");

          let svg = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          svg.setAttribute('x', x.toString());
          svg.setAttribute('y', y.toString());

          // set text color
          svg.setAttribute('style', `
            box-shadow: 0px 0px 5px 8px #FFFFFF;
            background-color: #FFFFFF;
          ` + 'color: ' + this.selectedColor + ';' + (this.transparent ? 'opacity: 0.5;' : ''));

          // svg.setAttribute('')
          svg.innerHTML = svg_str;

          this.svg.appendChild(svg);

          this.actual_object = genKey();
          this.last_actual_object = this.actual_object;
          this.objects.set(this.actual_object, svg);
          this.objects_data.set(this.actual_object, {
            type: Tool.math,
            color: this.selectedColor,
            style: this.selectedStyle,
            transparent: this.transparent,
            shape:[[x, y], [x, y], ""]
          });

          // set focus force
          setTimeout(() => {
            this.mathfield.focus();
          }, 100);
          
          
            
        }
        else{
          if (this.typeMath){

            this.objects.get(this.actual_object).setAttribute('x', x.toString());
            this.objects.get(this.actual_object).setAttribute('y', y.toString());
            let obj_data = this.objects_data.get(this.actual_object);
            if (!obj_data) return;
            let last_pos:any = obj_data.shape[0];
            obj_data.shape[0] = [x, y];
            obj_data.shape[1][0] += x - last_pos[0];
            obj_data.shape[1][1] += y - last_pos[1];
            // this.objects_data.set(this.actual_object, obj_data);

          }

          setTimeout(() => {
            this.mathfield.focus();
          }, 100);

          this.update_db();
        }
      }
    }
    else if (event.buttons == 2){

      this.right_click = this.mouseToSVG(event.clientX, event.clientY);
      this.svg.style.cursor = "grabbing";
    }
  }


 

  mouseMove(event:MouseEvent) {
    let pos = this.mouseToSVG(event.clientX, event.clientY);
    let x = pos[0]
    let y = pos[1]
    
    if (this.selectedTool == Tool.pen && this.actual_object) {
      let svg = this.objects.get(this.actual_object);
      let svg_data = this.objects_data.get(this.actual_object);
      if (!svg || !svg_data) return;

      // compute distance between last point and current point
      let dx = x - svg_data.shape[svg_data.shape.length-1][0];
      let dy = y - svg_data.shape[svg_data.shape.length-1][1];
      let l = Math.sqrt(dx*dx + dy*dy);
      if (l < this.selectedStyle) return;

      svg_data.shape.push([x, y]);

      let d = 'M '+svg_data.shape[0][0]+' '+svg_data.shape[0][1];
      for (let i=1; i<svg_data.shape.length; i+=2) {
        d += ' L '+svg_data.shape[i][0]+' '+svg_data.shape[i][1];
      }
      svg.setAttribute('d', d);
      this.update_db();
    }
    else if (this.selectedTool == Tool.eraser && this.eraser_on) {
      this.erase(this.eraser_last, [x, y])
      this.eraser_last = [x, y];
    }
    else if (this.selectedTool == Tool.line && this.actual_object) {
      let svg = this.objects.get(this.actual_object);
      let svg_data = this.objects_data.get(this.actual_object);
      if (!svg || !svg_data) return;

      svg_data.shape[1] = [x, y];
      svg.setAttribute('x2', x);
      svg.setAttribute('y2', y);

      this.update_db();
    }
    else if (this.selectedTool == Tool.arrow && this.actual_object) {
      let svg = this.objects.get(this.actual_object);
      let svg_data = this.objects_data.get(this.actual_object);
      if (!svg || !svg_data) return;

      svg_data.shape[1] = [x, y];
      svg[0].setAttribute('x2', x);
      svg[0].setAttribute('y2', y);

      let vx = svg_data.shape[1][0] - svg_data.shape[0][0];
      let vy = svg_data.shape[1][1] - svg_data.shape[0][1];
      let l = Math.sqrt(vx*vx + vy*vy);
      vx /= l;
      vy /= l;

      let x2_right = x + (vx * -COS_45 - vy * -SIN_45) * ARROW_LENGHT * this.selectedStyle;
      let y2_right = y + (vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * this.selectedStyle;
      let x2_left = x + (vx * -COS_45 + vy * -SIN_45) * ARROW_LENGHT * this.selectedStyle;
      let y2_left = y + (-vx * -SIN_45 + vy * -COS_45) * ARROW_LENGHT * this.selectedStyle;


      svg[1].setAttribute('x1', x.toString());
      svg[1].setAttribute('y1', y.toString());
      svg[1].setAttribute('x2', x2_right.toString());
      svg[1].setAttribute('y2', y2_right.toString());

      svg[2].setAttribute('x1', x.toString());
      svg[2].setAttribute('y1', y.toString());
      svg[2].setAttribute('x2', x2_left.toString());
      svg[2].setAttribute('y2', y2_left.toString()); 
      
      
      this.update_db();
    }
    else if (this.selectedTool == Tool.rectangle && this.actual_object) {
      let svg = this.objects.get(this.actual_object);
      let svg_data = this.objects_data.get(this.actual_object);
      
      if (!svg || !svg_data) return;
      
      let xo = Math.min(svg_data.shape[0][0], svg_data.shape[1][0]);
      let yo = Math.min(svg_data.shape[0][1], svg_data.shape[1][1]);
      let width = Math.abs(svg_data.shape[0][0] - svg_data.shape[1][0]);
      let height = Math.abs(svg_data.shape[0][1] - svg_data.shape[1][1]);
      svg.setAttribute('x', xo);
      svg.setAttribute('y', yo);
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);


      svg_data.shape[1] = [x, y];

      this.update_db();
    }
    else if (this.selectedTool == Tool.circle && this.actual_object) {

      let svg = this.objects.get(this.actual_object);
      let svg_data = this.objects_data.get(this.actual_object);
      if (!svg || !svg_data) return;

      let radius = Math.sqrt(Math.pow(x - svg_data.shape[0][0], 2) + Math.pow(y - svg_data.shape[0][1], 2));
      svg_data.shape[1] = radius;
      svg.setAttribute('rx', radius);
      svg.setAttribute('ry', radius);    
      
      
      this.update_db();
    }
    else if (this.right_click != null){


      var motion = [x - this.right_click[0], y - this.right_click[1]];
      
      // replace right click position and anticipate next translation
      this.right_click = [x - motion[0], y - motion[1]];

      // apply translation
      this.set_translate([this.actual_translate[0] - motion[0], this.actual_translate[1] - motion[1]])
    
      this.svg.style.cursor = "grabbing";
    }

  }

  updateMath(event:Event|null=null){
    let value = this.mathfield.value.replace(/\\placeholder/g, "")
    let svg_str =  TeXToSVG(value);

    if (!this.actual_object) return;

    let svg = this.objects.get(this.actual_object);
    let svg_data = this.objects_data.get(this.actual_object);
    if (!svg || !svg_data) return;

    svg.innerHTML = svg_str;

    let svg_content:any = svg.firstChild;
    if (!svg_content) return;


    let width = parseFloat(svg_content.getAttribute('width'));
    let height = parseFloat(svg_content.getAttribute('height'));
    let ratio = width / height;
    

    let size = 0
    switch (this.selectedStyle) {
      case Style.veryThin:
        size = 12;
        break;
      case Style.thin:
        size = 18;
        break;
      case Style.medium:
        size = 25;
        break;
      case Style.thick:
        size = 40;
        break;
      case Style.veryThick:
        size = 60;
        break;
    }


    let height_px = size * height / 2.0;
    let width_px = height_px * ratio ;

    svg.setAttribute('width', width_px.toString());
    svg.setAttribute('height', height_px.toString());
    // set style 'vertical-align' 0
    svg_content.setAttribute('style', 'vertical-align: 0;');
    svg_content.setAttribute('width', width_px+"px");
    svg_content.setAttribute('height', height_px+"px");

    svg_data.shape =  [[svg_data.shape[0][0], svg_data.shape[0][1]], [svg_data.shape[0][0] + width_px, svg_data.shape[0][1] + height_px], value];
    svg_data.color = this.selectedColor;
    svg_data.style = this.selectedStyle;


    this.update_db();
  }

  erase(A:[number, number], B:[number, number]){
    for (let [key, svg_data] of this.objects_data) {
      let svg = this.objects.get(key);
      if (!svg) continue;

      if ((svg_data.type == Tool.pen
        && CollisionService.penIntersect(A, B, svg_data.shape))

        || (svg_data.type == Tool.rectangle 
        && CollisionService.rectangleIntersect(A, B, svg_data.shape[0], svg_data.shape[1]))

        || (svg_data.type == Tool.circle
        && CollisionService.circleIntersect(A, B, svg_data.shape[0], svg_data.shape[1]))

        || (svg_data.type == Tool.line
        && CollisionService.segmentIntersect(A, B, svg_data.shape[0], svg_data.shape[1]))

        || (svg_data.type == Tool.arrow
        && CollisionService.segmentIntersect(A, B, svg_data.shape[0], svg_data.shape[1]))

        || (svg_data.type == Tool.math
        && CollisionService.mathIntersect(A, B, svg_data.shape[0], svg_data.shape[1]))
      )
      {
        if (svg_data.type != Tool.arrow){
          this.svg.removeChild(svg);
        }
        else{
          for (let i=0; i<svg.length; i++){
            this.svg.removeChild(svg[i]);
          }
        }
        this.objects.delete(key);
        this.objects_data.delete(key);

        this.db.database.ref('boards/' + this.board_id + '/objects/' + key).remove();
      }
    }
  }
  
  mouseUp(event:MouseEvent) {
    if (event.button == 0) 
      this.stopDrawing();
    else if (event.button == 2)
    {
      this.right_click = null;
      this.svg.style.cursor = "default";
    }
  }
  focusOut(event:Event) {
    this.stopDrawing();
  }

  stopDrawing() {

    this.eraser_on = false;


    if (!this.actual_object) return;
    var svg = this.objects.get(this.actual_object);
    var svg_data = this.objects_data.get(this.actual_object);
    if (!svg || !svg_data) return;

    

    if ((this.selectedTool == Tool.pen && svg_data.shape.length <= 2)
     || (this.selectedTool == Tool.line && svg_data.shape[0][0] == svg_data.shape[1][0] && svg_data.shape[0][1] == svg_data.shape[1][1])
      || (this.selectedTool == Tool.arrow && svg_data.shape[0][0] == svg_data.shape[1][0] && svg_data.shape[0][1] == svg_data.shape[1][1])
      || (this.selectedTool == Tool.rectangle && svg_data.shape[0][0] == svg_data.shape[1][0] && svg_data.shape[0][1] == svg_data.shape[1][1])
      || (this.selectedTool == Tool.circle && svg_data.shape[1] == 0)
    )
    {
      if (this.selectedTool != Tool.arrow) {
        this.svg.removeChild(svg);
      }
      else{
        for (let i = 0; i < svg.length; i++) {
          this.svg.removeChild(svg[i]);
        }
      }
      this.objects.delete(this.actual_object);
      this.objects_data.delete(this.actual_object);

      this.db.database.ref('boards/' + this.board_id + '/objects/' + this.actual_object).remove();
    }

    if (this.selectedTool == Tool.pen 
      || this.selectedTool == Tool.line
      || this.selectedTool == Tool.arrow
      || this.selectedTool == Tool.rectangle
      || this.selectedTool == Tool.circle
      ) {
        if (this.actual_object != null) {
          this.actual_object = null;
          this.update_db(true);
        }
      }
  }

  validMath(){
    if (!this.actual_object) return;
    var svg = this.objects.get(this.actual_object);
    var svg_data = this.objects_data.get(this.actual_object);
    if (!svg || !svg_data) return;

    if (this.selectedTool == Tool.math && 
      ((svg_data.shape[0][0] == svg_data.shape[1][0] && svg_data.shape[0][1] == svg_data.shape[1][1])|| svg_data.shape[2] == "")){
        this.svg.removeChild(svg);
        this.objects.delete(this.actual_object);
        this.objects_data.delete(this.actual_object);
        console.log("delete");
        
        this.db.database.ref('boards/' + this.board_id + '/objects/' + this.actual_object).remove();
    }
    
    this.typeMath = false;
    this.computeBackground();
    document.getElementById("header")?.classList.remove("small");
    this.mathfield.setValue("");
    window.mathVirtualKeyboard.hide();

    this.actual_object = null;
  }


  onResize(event:Event) {
    this.computeBackground();
  }


  computeBackground() {

    if (this.typeMath){
      // get window height
      let height = window.innerHeight;
      // get header height
      let header = window.innerWidth * (3 + 5) / 100;
      // get virtual keyboard height
      let keyboard = document.getElementsByClassName("MLK__backdrop")[0]?.getBoundingClientRect().height;
      if (keyboard == null) keyboard = 0;

      document.getElementById("svg")?.setAttribute("style", "height: " + (height - header - keyboard) + "px");
    }
    else
    {
      document.getElementById("svg")?.removeAttribute("style");
    }

    

    let background = document.getElementById('background') as HTMLInputElement;

    let svg_box = this.svg.getBoundingClientRect();

    let x = svg_box.left;
    let y = svg_box.top;
    let width = svg_box.width;
    let height = svg_box.height;

    let virtualWidth = 1000;
    let virtualHeight = 1000;

    const NB_DOT = 16;


    let scale = Math.min(width / virtualWidth, height / virtualHeight);
    

    let svg_tile_width = scale * virtualWidth / NB_DOT;
    let svg_tile_width_half = svg_tile_width / 2.0;
    let svg_radius = svg_tile_width/25.0;

    svg_tile_width = svg_tile_width;
    svg_tile_width_half = svg_tile_width_half;

    let backgound_delta_x = (width - virtualWidth * scale) / 2.0 + 50 * scale / NB_DOT - this.actual_translate[0] * scale
    let backgound_delta_y = (height - virtualHeight * scale) / 2.0 + 50 * scale / NB_DOT - this.actual_translate[1] * scale

    console.log();
    

    console.log("backgound_delta_x", backgound_delta_x);
    console.log("backgound_delta_y", backgound_delta_y);
    console.log("svg_tile_width", svg_tile_width);
    console.log("scale", scale);
    
    
    //<circle mask="url(#fade)" cx="${svg_tile_width_half}" cy="${svg_tile_width_half}" r="${svg_radius}" fill="#909090"></circle>
    // <rect class="checker" x="0" y="0" width="${svg_tile_width_half}" height="${svg_tile_width_half}" fill="#50FFFF"></rect>
    // <rect class="checker" x="${svg_tile_width_half}" y="${svg_tile_width_half}" width="${svg_tile_width_half}" height="${svg_tile_width_half}" fill="#50FFFF" ></rect>
    
    let backgound_svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <pattern id="pattern-circles" x="${backgound_delta_x}" y="${backgound_delta_y}" width="${svg_tile_width}" height="${svg_tile_width}" patternUnits="userSpaceOnUse">

          <circle mask="url(#fade)" cx="${svg_tile_width_half}" cy="${svg_tile_width_half}" r="${svg_radius}" fill="#909090"></circle>
        </pattern>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"></rect>
      </svg>`
    // remove newlines, tabs and spaces
    backgound_svg = backgound_svg.replace(/(\r\n|\n|\r|\t|\s\s)/gm, '');

    let backgound_svg_base64 = btoa(backgound_svg);

    background.setAttribute("style", `
      overflow: hidden; 
      position: absolute;
      top: 0px;
      left: 0px;
      width: ${width}px;
      height: ${height}px;
      background-color: rgb(255, 255, 255); 
      background-image: url("data:image/svg+xml;base64,${backgound_svg_base64}"); 
      background-position: -${svg_radius}px -${svg_radius}px;"
    `);
  }




  update_db(force = false) {
    if (this.update_db_timeout){
      clearTimeout(this.update_db_timeout);
      this.update_db_timeout = undefined;
    }


    if (force){
      // if the object exists in the database, update it
      if (this.objects_data.get(this.last_actual_object)){
        this.db.database.ref("boards/" + this.board_id + "/objects/"+this.last_actual_object).set(
          this.objects_data.get(this.last_actual_object)
        );
      }
      else // remove it
      {
        this.db.database.ref("boards/" + this.board_id + "/objects/"+this.last_actual_object).remove();
      }
    }
    else
    {
      this.update_db_timeout = setTimeout(() => {
        this.update_db(true);
        this.update_db_timeout = undefined;
      }, UPDATE_DB_DELAY);
    }
    
    
  }

  set_translate(vec: [number, number]){
    this.actual_translate = vec;
    // get svg and set box
    this.svg.setAttribute("viewBox", this.actual_translate[0] + " " + this.actual_translate[1] + " 1000 1000");
    this.computeBackground();
  }


  contextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

}
