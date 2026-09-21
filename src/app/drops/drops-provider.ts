import { Observable } from 'rxjs';
import { ActiveDrop } from './active-drop';

export abstract class DropsProvider {
  abstract loadActiveDrops(): Observable<readonly ActiveDrop[]>;
}
