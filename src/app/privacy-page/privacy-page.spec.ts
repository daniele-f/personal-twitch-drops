import { TestBed } from '@angular/core/testing';
import { PrivacyPageComponent } from './privacy-page';

describe('PrivacyPageComponent', () => {
  it('identifies Unidea and provides the privacy contact address', () => {
    TestBed.configureTestingModule({ imports: [PrivacyPageComponent] });
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unidea');
    const contact = fixture.nativeElement.querySelector('a[href="mailto:privacy@unidea.dev"]') as HTMLAnchorElement;
    expect(contact.textContent?.trim()).toBe('privacy@unidea.dev');
  });

  it('discloses the public data sources contacted while browsing drops', () => {
    TestBed.configureTestingModule({ imports: [PrivacyPageComponent] });
    const fixture = TestBed.createComponent(PrivacyPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('twitchdrops.app');
    expect(fixture.nativeElement.textContent).toContain('Wikidata');
  });
});
