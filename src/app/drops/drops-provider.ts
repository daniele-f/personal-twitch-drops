import { Observable } from 'rxjs';
import { ActiveDrop } from './active-drop';
import { DropDetails } from './drop-details';

export abstract class DropsProvider {
  abstract loadActiveDrops(): Observable<readonly ActiveDrop[]>;
  abstract loadDropDetails(id: string): Observable<DropDetails>;
}
