import { PendingDevice } from "./device/pending";

/**
 * IDevice factories
 */
export const Device = {
    /**
     * Return a Device that talks to the first one found on the network
     */
    any() {
        return new PendingDevice("any", () => true);
    },

    /**
     * Create a Device that talks to the first device on the network
     * with the given ID
     */
    withId(id: string) {
        return new PendingDevice(`with id ${id}`, device => device.id === id);
    },
};
