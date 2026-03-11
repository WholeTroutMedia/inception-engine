// componentVariation flow — see generate-variation.ts for the full IRIS-GEN implementation
export const componentVariationFlow = async (prompt: string) => {
    // Generate component variations
    return [{ id: 'var1', code: '<Button variant="primary" />' }];
};
