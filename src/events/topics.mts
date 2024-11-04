// Let's pretend that the proto library builds this map by topic
// and that it is imported from npm
export interface PetEvent {
  $type: "io.swan.events.petEvents.PetEvent";
  event?:
    | { $case: "petCreated"; petCreated: PetCreatedEvent }
    | { $case: "petDeleted"; petDeleted: PetDeletedEvent }
    | undefined;
}

export interface PetCreatedEvent {
  $type: "io.swan.events.petEvents.PetCreatedEvent";
  petId: string;
  ownerId: string;
}

export interface PetDeletedEvent {
  $type: "io.swan.events.petEvents.PetDeletedEvent";
  petId: string;
  ownerId: string;
}

export interface IdentityEvent {
  $type: "io.swan.events.identityEvents.IdentityEvent";
  event?:
    | { $case: "identityCreated"; identityCreated: IdentityCreatedEvent }
    | { $case: "identityDeleted"; identityDeleted: IdentityDeletedEvent }
    | undefined;
}

export interface IdentityCreatedEvent {
  $type: "io.swan.events.identityEvents.identityCreatedEvent";
  userId: string;
}

export interface IdentityDeletedEvent {
  $type: "io.swan.events.identityEvents.IdentityDeletedEvent";
  userId: string;
}

export type Topics = {
  identityEvents: IdentityEvent;
  pets: PetEvent;
};
