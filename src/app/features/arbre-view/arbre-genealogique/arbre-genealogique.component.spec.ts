import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArbreGenealogiqueComponent } from './arbre-genealogique.component';

describe('ArbreGenealogiqueComponent', () => {
  let component: ArbreGenealogiqueComponent;
  let fixture: ComponentFixture<ArbreGenealogiqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ArbreGenealogiqueComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArbreGenealogiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
