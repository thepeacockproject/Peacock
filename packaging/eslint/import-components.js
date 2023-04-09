// @ts-check
/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
    create(context) {
        return {
            ImportDeclaration: function (node) {
                if (!node.source.value?.toString().startsWith("components")) {
                    return
                }

                context.report({
                    node,
                    message:
                        "Module paths can't start with 'components', use '../' instead.",
                })
            },
        }
    },
}
