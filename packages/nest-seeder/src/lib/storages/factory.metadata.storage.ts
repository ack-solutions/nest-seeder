import { Type } from '@nestjs/common';

import {
    FactoryValue,
    FactoryValueGenerator,
} from '../decorators/factory.decorator';


export type PropertyMetadataType = {
    target?: any;
    propertyKey?: any;
    arg: {
        generator: FactoryValueGenerator | FactoryValue;
        dependsOn?: string[];
    };
};

export class FactoryMetadataStorageHost {

    private properties: PropertyMetadataType[] = [];

    addPropertyMetadata(metadata: PropertyMetadataType): void {
        this.properties.push(metadata);
    }

    /**
     * Returns the factory property metadata for a target class.
     *
     * The whole prototype chain is walked so that a factory which `extends`
     * another factory inherits the parent's `@Factory` properties. Properties
     * are returned base-class-first, in declaration order. When a subclass
     * re-declares a property, the subclass definition wins but keeps the
     * original position.
     */
    getPropertyMetadatasByTarget(
        target: Type<unknown>,
    ): PropertyMetadataType[] {
        const chain = this.getPrototypeChain(target);
        const byKey = new Map<string, PropertyMetadataType>();

        for (const ctor of chain) {
            for (const property of this.properties) {
                if (property.target === ctor) {
                    byKey.set(property.propertyKey, property);
                }
            }
        }

        return Array.from(byKey.values());
    }

    /** Removes all stored metadata. Primarily useful in tests. */
    clear(): void {
        this.properties = [];
    }

    private getPrototypeChain(target: Type<unknown>): Array<Type<unknown>> {
        const chain: Array<Type<unknown>> = [];
        let current: any = target;

        while (
            typeof current === 'function' &&
            current !== Function.prototype &&
            current !== Object
        ) {
            chain.unshift(current); // base class first
            current = Object.getPrototypeOf(current);
        }

        return chain;
    }

}

const globalRef = global as any;

export const FactoryMetadataStorage: FactoryMetadataStorageHost = globalRef.FactoryMetadataStorage ||
    (globalRef.FactoryMetadataStorage = new FactoryMetadataStorageHost());
