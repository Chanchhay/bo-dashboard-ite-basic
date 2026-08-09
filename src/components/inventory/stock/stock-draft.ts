/**
 * Local, unsaved stock movements.
 *
 * Static preview: recording an in/out here moves the number on screen and adds
 * a row to Movements, but nothing is sent anywhere. It exists so the flow can
 * be judged — how you pick a unit, what the balance lands on, what the ledger
 * reads like — before any endpoint is designed.
 *
 * The shape deliberately mirrors what a real stock entry needs, so wiring it up
 * later is a swap rather than a rewrite.
 */

export type StockTargetKind = "ITEM" | "ADDON";

export type DraftMovement = {
    id: string;
    targetKind: StockTargetKind;
    targetId: string;
    targetName: string;
    /** `STOCK_IN` and `STOCK_OUT` are the two an operator records by hand. */
    direction: "IN" | "OUT";
    /** What the operator typed, in the unit they chose. */
    enteredQuantity: number;
    enteredUnitLabel: string;
    /** The same amount converted into the target's base unit — what is stored. */
    baseQuantity: number;
    baseUnitLabel: string;
    /** Cost of one base unit. Only meaningful on the way in. */
    unitCost?: number;
    reason: string;
    at: string;
};

/** Signed change in base units: out removes, in adds. */
export function signedChange(movement: DraftMovement) {
    return movement.direction === "IN"
        ? movement.baseQuantity
        : -movement.baseQuantity;
}

/** Net effect of every draft movement recorded against one target. */
export function draftBalance(
    movements: readonly DraftMovement[],
    targetKind: StockTargetKind,
    targetId: string,
) {
    return movements
        .filter(
            (movement) =>
                movement.targetKind === targetKind &&
                movement.targetId === targetId,
        )
        .reduce((total, movement) => total + signedChange(movement), 0);
}
