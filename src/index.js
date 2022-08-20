const React = require("react");
const ReactDOM = require("react-dom/client");
const isPlainObject = require("lodash/isPlainObject");
const isEqual = require("lodash/isEqual");

function angularize(Component, componentName, angularApp, bindings) {
  bindings = bindings || {};
  if (typeof window === "undefined" || typeof angularApp === "undefined")
    return;

  angularApp.component(componentName, {
    bindings,
    controller: [
      "$element",
      function ($element) {
        if (window.angular) {
          // Add $scope
          this.$scope = window.angular.element($element).scope();

          // Create a map of objects bound by '='
          // For those that exists, use $doCheck to check them using angular.equals and trigger $onChanges
          const previous = {};
          this.$onInit = () => {
            for (let bindingKey of Object.keys(bindings)) {
              if (/^data[A-Z]/.test(bindingKey)) {
                console.warn(
                  `'${bindingKey}' binding for ${componentName} component will be undefined because AngularJS ignores attributes starting with data-`
                );
              }

              if (bindings[bindingKey] === "=") {
                previous[bindingKey] = window.angular.copy(this[bindingKey]);
              }
            }
          };

          this.$doCheck = () => {
            for (let previousKey of Object.keys(previous)) {
              if (!equals(this[previousKey], previous[previousKey])) {
                this.$onChanges();
                previous[previousKey] = window.angular.copy(this[previousKey]);
                return;
              }
            }
          };
        }

        const root = ReactDOM.createRoot($element[0]);
        this.$onChanges = () => {
          root.render(React.createElement(Component, this));
        };
      },
    ],
  });
}

function angularizeDirective(Component, directiveName, angularApp, bindings) {
  bindings = bindings || {};
  if (typeof window === "undefined" || typeof angularApp === "undefined")
    return;

  angularApp.directive(directiveName, function () {
    return {
      scope: bindings,
      replace: true,
      link: function (scope, element) {
        // Add $scope
        scope.$scope = scope;

        // Watch for any changes in bindings, then rerender
        const keys = [];
        for (let bindingKey of Object.keys(bindings)) {
          if (/^data[A-Z]/.test(bindingKey)) {
            console.warn(
              `'${bindingKey}' binding for ${directiveName} directive will be undefined because AngularJS ignores attributes starting with data-`
            );
          }
          if (bindings[bindingKey] !== "&") {
            keys.push(bindingKey);
          }
        }

        const root = ReactDOM.createRoot($element[0]);
        scope.$watchGroup(keys, () => {
          root.render(React.createElement(Component, scope));
        });
      },
    };
  });
}

function getService(serviceName) {
  if (typeof window === "undefined" || typeof window.angular === "undefined")
    return {};
  return window.angular.element(document.body).injector().get(serviceName);
}

function equals(o1, o2) {
  // Compare plain objects without equality check that angular.equals does
  if (isPlainObject(o1) && isPlainObject(o2)) {
    return isEqual(o1, o2);
  }
  return window.angular.equals(o1, o2);
}

module.exports = {
  getService,
  angularize,
  angularizeDirective,
};
