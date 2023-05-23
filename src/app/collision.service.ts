import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CollisionService {

  constructor() { }

  static segmentIntersect(A:[number, number],B:[number, number],I:[number, number],P:[number, number]):boolean {
    // Return true if line segments AB and CD intersect
    let D = [B[0]-A[0],B[1]-A[1]];
    let E = [P[0]-I[0],P[1]-I[1]];

    let d = D[0]*E[1] - D[1]*E[0];
    if (d == 0) return false;

    let t = -(A[0]*E[1] - I[0]*E[1] - E[0]*A[1] + E[0]*I[1])/d;
    if (t < 0 || t > 1) return false;

    let u = -(-D[0]*A[1] + D[0]*I[1] + D[1]*A[0] - D[1]*I[0])/d;
    if (u < 0 || u > 1) return false;

    return true;

  }

  static isInCircle(P:[number, number], C:[number, number], r:number):boolean {
    return Math.pow(P[0]-C[0],2) + Math.pow(P[1]-C[1],2) <= Math.pow(r,2);
  }

  static circleIntersect(A:[number, number],B:[number, number],C:[number, number],r:number):boolean {
    return (this.isInCircle(A,C,r) != this.isInCircle(B,C,r));
  }

  static penIntersect(A:[number, number],B:[number, number],C:[number, number][]):boolean {
    for (let i = 0; i < C.length-1; i++) {
      if (this.segmentIntersect(A,B,C[i],C[i+1])) return true;
    }
    return false;
  }
  static rectangleIntersect(A:[number, number],B:[number, number],C:[number, number], D:[number, number]):boolean {
    return (this.segmentIntersect(A,B,C,[C[0],D[1]]) ||
            this.segmentIntersect(A,B,[C[0],D[1]],D) ||
            this.segmentIntersect(A,B,D,[D[0],C[1]]) ||
            this.segmentIntersect(A,B,[D[0],C[1]],C));
  }

  static insideRectangle(A:[number, number],B:[number, number],P:[number, number]):boolean {
    return (P[0] >= A[0] && P[0] <= B[0] && P[1] >= A[1] && P[1] <= B[1]);
  }

  static mathIntersect(A:[number, number],B:[number, number],C:[number, number], D:[number, number]){
    return (this.insideRectangle(C, D, A) || this.insideRectangle(C, D, B));
  }
    


}
