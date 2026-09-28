import { Directive, input } from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'neutral' | 'icon' | 'destructive';

@Directive({
  selector: '[appButton]',
  host: {
    '[class.app-button]': 'true',
    '[class.app-button--default]': "appButton() === 'default'",
    '[class.app-button--primary]': "appButton() === 'primary'",
    '[class.app-button--neutral]': "appButton() === 'neutral'",
    '[class.app-button--icon]': "appButton() === 'icon'",
    '[class.app-button--destructive]': "appButton() === 'destructive'",
  },
})
export class ButtonDirective {
  readonly appButton = input<ButtonVariant>('default');
}
