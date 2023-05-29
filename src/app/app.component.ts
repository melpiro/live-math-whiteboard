import { Component } from '@angular/core';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'math-whiteboard';

  constructor(analytics: AngularFireAnalytics) {
    analytics.logEvent('math-whiteboard');
    // analytics.logEvent('page_view', { page_path: router.url });

  }
}
